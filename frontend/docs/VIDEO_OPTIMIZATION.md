# Video Optimization Guide

## Current Implementation

The homepage now serves responsive video files based on device type:
- **Desktop/Tablet**: Full-quality videos
- **Mobile**: Compressed mobile versions (when available)

## Video Files

### Desktop Versions (Current)
- `/mainpage/CanViet_Exchange_Video_Banner_Extension.mp4`
- `/mainpage/Banner_Video_Remake_With_Better_Soundtrack.mp4`

### Mobile Versions (To Be Added)
- `/mainpage/CanViet_Exchange_Video_Banner_Extension_mobile.mp4`
- `/mainpage/Banner_Video_Remake_With_Better_Soundtrack_mobile.mp4`

## How to Create Compressed Mobile Videos

### Option 1: FFmpeg (Recommended)

```bash
# Compress video for mobile (reduce resolution, bitrate, and file size)
ffmpeg -i CanViet_Exchange_Video_Banner_Extension.mp4 \
  -vf "scale=iw/2:ih/2" \
  -c:v libx264 \
  -preset slow \
  -crf 28 \
  -c:a aac \
  -b:a 96k \
  CanViet_Exchange_Video_Banner_Extension_mobile.mp4

# For the second video
ffmpeg -i Banner_Video_Remake_With_Better_Soundtrack.mp4 \
  -vf "scale=iw/2:ih/2" \
  -c:v libx264 \
  -preset slow \
  -crf 28 \
  -c:a aac \
  -b:a 96k \
  Banner_Video_Remake_With_Better_Soundtrack_mobile.mp4
```

**Parameters explained:**
- `scale=iw/2:ih/2`: Reduce resolution by half (e.g., 1920x1080 → 960x540)
- `-crf 28`: Constant Rate Factor (18=high quality, 28=medium, 32=lower quality)
- `-preset slow`: Better compression (slower encode time)
- `-b:a 96k`: Audio bitrate reduced to 96 kbps

### Option 2: HandBrake (GUI Tool)

1. Download [HandBrake](https://handbrake.fr/)
2. Open your video
3. Select preset: "Fast 720p30" or "Fast 480p30"
4. Adjust quality slider to 50-60% for mobile
5. Save with `_mobile` suffix

### Option 3: Online Tools

- [CloudConvert](https://cloudconvert.com/mp4-converter)
- [Zamzar](https://www.zamzar.com/convert/mp4-compress/)

## Target File Sizes

| Device | Resolution | Target Size | Notes |
|--------|-----------|-------------|-------|
| Desktop | 1920x1080 | 5-15 MB | Current files |
| Mobile | 960x540 | 1-3 MB | To be added |

## Testing Mobile Performance

### Check file size reduction:
```bash
ls -lh public/mainpage/*.mp4
```

### Test mobile detection:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device
4. Reload page
5. Check Network tab for which video loads

## Fallback Behavior

If mobile videos don't exist yet:
- Desktop videos will be served to mobile users
- No errors will occur
- Page will still work, just with larger file sizes

## Next Steps

1. ✅ Code implemented for responsive video serving
2. ⏳ Compress existing videos using FFmpeg/HandBrake
3. ⏳ Upload mobile versions to `public/mainpage/`
4. ⏳ Test on real mobile devices
5. ⏳ Monitor bandwidth savings in analytics

## Performance Gains

Expected improvements for mobile users:
- **File size**: 80-90% reduction
- **Load time**: 70-85% faster
- **Data usage**: Save 10-40 MB per page load
- **UX**: Smoother playback, less buffering

---

**Implementation Date**: December 11, 2025  
**Status**: Code ready, mobile video files pending
