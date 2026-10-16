// ffmpeg's JPEG decoder produces full-range BT.601. Convert samples AND tag them.
export const colorTags = ['-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1'];
export const jpegConversion = 'scale=in_range=pc:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709';

export function bitrateFor({ width, height, fps, parts = 0, draft = false }) {
  // Screen text needs more bits than a photographic scene. Scale with pixels,
  // frame rate and scene complexity; --bitrate can override this conservative budget.
  return Math.round(width * height * fps * (draft ? 0.16 : 0.4 + Math.min(0.2, parts / 800)));
}

export function videoArgs({ browser, fps, crf, preset, out }) {
  return ['-y', '-v', 'error', ...(browser
    ? ['-f', 'h264', '-r', String(fps), '-i', '-', '-c:v', 'copy', '-bsf:v',
      'h264_metadata=video_full_range_flag=0:colour_primaries=1:transfer_characteristics=13:matrix_coefficients=1']
    : ['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-vf', jpegConversion,
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
  const check = () => { if (state.error) throw new Error(state.error); };
  window.__video = {
    async step(i, t) {
      check(); const painted = window.__paint(t, blur, shutter);
      const frame = new VideoFrame(painted, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
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
