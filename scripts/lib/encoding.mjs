// ffmpeg's JPEG decoder produces full-range BT.601. Convert samples AND tag them.
export const colorTags = ['-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1'];
export const jpegConversion = 'scale=in_range=pc:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709';
export const pngConversion = 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709';

export function bitrateFor({ width, height, fps, parts = 0, draft = false }) {
  // Screen text needs more bits than a photographic scene. Scale with pixels,
  // frame rate and scene complexity; --bitrate can override this conservative budget.
  return Math.round(width * height * fps * (draft ? 0.16 : 0.4 + Math.min(0.2, parts / 800)));
}

export function videoArgs({ browser, fps, crf, preset, out, input = 'jpeg' }) {
  if (!['jpeg', 'png'].includes(input)) throw new Error('input must be jpeg or png');
  return ['-y', '-v', 'error', ...(browser
    ? ['-f', 'h264', '-r', String(fps), '-i', '-', '-c:v', 'copy', '-bsf:v',
      'h264_metadata=video_full_range_flag=0:colour_primaries=1:transfer_characteristics=13:matrix_coefficients=1']
    : ['-f', 'image2pipe', '-framerate', String(fps), '-c:v', input === 'png' ? 'png' : 'mjpeg', '-i', '-', '-vf', input === 'png' ? pngConversion : jpegConversion,
      '-c:v', 'libx264', '-crf', String(crf), '-preset', preset, '-pix_fmt', 'yuv420p']),
  ...colorTags, '-movflags', '+faststart', out];
}

// Runs in the page. Keep this function self-contained (serialized over CDP).
export async function installEncoder({ fps, bitrate, blur, shutter }) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined' || typeof window.__paint !== 'function') return false;
  const canvas = document.getElementById('c');
  const config = { codec: 'avc1.640032', width: canvas.width, height: canvas.height,
    bitrate, framerate: fps, hardwareAcceleration: 'prefer-software', latencyMode: 'quality', avc: { format: 'annexb' } };
  try { if (!(await VideoEncoder.isConfigSupported(config)).supported) return false; } catch { return false; }
  const state = { queue: [], error: null, frames: 0 };
  const encoder = new VideoEncoder({ output(chunk) {
    const bytes = new Uint8Array(chunk.byteLength); chunk.copyTo(bytes); state.queue.push(bytes); state.frames++;
  }, error(e) { state.error = String(e); } });
  try { encoder.configure(config); } catch { encoder.close(); return false; }
  // Chromium's CPU RGB input can encode full-range YUV, unlike the product
  // canvas path. Supply explicit limited-range BT.709 I420 planes instead of
  // overwriting tags on differently encoded samples. No GPU staging/readback.
  const context = canvas.getContext('2d'), cpu = !!context.getContextAttributes?.().willReadFrequently;
  if (cpu && (canvas.width % 2 || canvas.height % 2)) { encoder.close(); return false; }
  const w = canvas.width, h = canvas.height, size = w * h, yuv = cpu ? new Uint8Array(size * 1.5) : null;
  const cpuFrame = (timing) => {
    const pixels = context.getImageData(0, 0, w, h).data; let chroma = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      let r = 0, green = 0, b = 0;
      for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
        const at = (y + row) * w + x + col, p = at * 4;
        const red = pixels[p], g0 = pixels[p + 1], blue = pixels[p + 2];
        r += red; green += g0; b += blue;
        yuv[at] = Math.round(16 + 219 / 255 * (.2126 * red + .7152 * g0 + .0722 * blue));
      }
      r *= .25; green *= .25; b *= .25;
      const luma = .2126 * r + .7152 * green + .0722 * b;
      yuv[size + chroma] = Math.round(128 + 224 / 255 * (b - luma) / (2 * (1 - .0722)));
      yuv[size * 1.25 + chroma++] = Math.round(128 + 224 / 255 * (r - luma) / (2 * (1 - .2126)));
    }
    return new VideoFrame(yuv, { ...timing, format: 'I420', codedWidth: w, codedHeight: h,
      colorSpace: { primaries: 'bt709', transfer: 'iec61966-2-1', matrix: 'bt709', fullRange: false } });
  };
  const check = () => { if (state.error) throw new Error(state.error); };
  window.__video = {
    async step(i, t) {
      check(); const painted = window.__paint(t, blur, shutter);
      const timing = { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) };
      const frame = cpu ? cpuFrame(timing) : new VideoFrame(painted, timing);
      try { encoder.encode(frame, { keyFrame: i % Math.round(fps * 2) === 0 }); } finally { frame.close(); }
      while (encoder.encodeQueueSize > 4) { check(); await new Promise((r) => setTimeout(r, 2)); }
      check();
    },
    drain() {
      check(); let text = '';
      for (const bytes of state.queue) for (let i = 0; i < bytes.length; i += 0x8000)
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      state.queue = []; return btoa(text);
    },
    async finish() { await encoder.flush(); check(); encoder.close(); return state.frames; }
  };
  return true;
}
