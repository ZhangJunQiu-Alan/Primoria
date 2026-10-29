import argparse
import json
import statistics
import subprocess
from collections import deque
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('video', type=Path)
parser.add_argument('--expected-frames', type=int, default=2700)
parser.add_argument('--size', default='1920x1080')
parser.add_argument('--report', type=Path)
args = parser.parse_args()
meta = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(args.video)]))
video = next(s for s in meta['streams'] if s['codec_type'] == 'video')
width, height = map(int, args.size.split('x'))
assert (video['width'], video['height']) == (width, height)
assert video['codec_name'] == 'h264'
assert video['r_frame_rate'] == '30/1'
assert abs(float(meta['format']['duration']) - args.expected_frames / 30) < 0.08
if args.expected_frames == 2700:
    audio = next(s for s in meta['streams'] if s['codec_type'] == 'audio')
    assert audio['codec_name'] == 'aac' and audio['sample_rate'] == '48000'

pixels = 192 * 108
process = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(args.video), '-vf', 'scale=192:108', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
window = deque(maxlen=3)
means = []
differences = []
errors = []
while True:
    frame = process.stdout.read(pixels)
    if not frame:
        break
    assert len(frame) == pixels, 'Truncated decoded frame'
    means.append(sum(frame) / pixels)
    if window:
        differences.append(sum(abs(a - b) for a, b in zip(window[-1], frame)) / pixels)
    window.append(frame)
    if len(window) == 3:
        before, current, after = window
        error = sum(abs(b - (a + c) / 2) for a, b, c in zip(before, current, after)) / pixels
        errors.append({'frame': len(means) - 2, 'error': round(error, 4)})
assert process.wait() == 0
assert len(means) == args.expected_frames, f'Expected {args.expected_frames}, decoded {len(means)}'
suspects = [item for item in errors if item['error'] > 4]
report = {
    'file': str(args.video.resolve()), 'framesDecoded': len(means),
    'duration': float(meta['format']['duration']), 'resolution': args.size,
    'videoCodec': video['codec_name'], 'fps': video['r_frame_rate'],
    'meanAdjacentDifference': round(statistics.mean(differences), 4),
    'medianAdjacentDifference': round(statistics.median(differences), 4),
    'meanLuminanceRange': [round(min(means), 4), round(max(means), 4)],
    'temporalErrorThreshold': 4, 'suspectFrames': suspects,
    'highestTemporalErrors': sorted(errors, key=lambda item: item['error'], reverse=True)[:20],
    'scope': 'Full decoded-frame temporal discontinuity scan; visual review remains separate.',
}
report_path = args.report or args.video.with_suffix('.verification.json')
report_path.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: value for key, value in report.items() if key != 'highestTemporalErrors'}, indent=2))
if suspects:
    raise SystemExit(f'{len(suspects)} temporal discontinuities require visual inspection')
