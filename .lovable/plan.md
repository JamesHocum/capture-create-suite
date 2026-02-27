

# ScreenCraft — Web-Based Screen Recorder & Screenshot Tool

A professional, dark-themed web application for capturing screenshots and recording screens directly in the browser, with full annotation and editing capabilities.

---

## 1. Authentication & User Management
- Sign up / log in with email and password (Supabase Auth)
- User profile with avatar and display name
- Protected routes — all features require login

## 2. Dashboard
- Dark, professional UI with a sidebar navigation
- Overview of recent screenshots and recordings
- Quick-action buttons: "New Screenshot" and "New Recording"
- Storage usage indicator
- Trash section with 30-day recovery

## 3. Screenshot Capture
- Capture visible tab or select a screen/window/area using the browser's Screen Capture API
- Unlimited screenshots saved to user's library
- Instant preview after capture

## 4. Annotation Tools (Screenshots)
- Draw freehand, arrows, lines, rectangles, circles
- Add text labels with customizable font size and color
- Highlight/blur regions
- Color picker for all tools
- Undo/redo support
- Save annotated version

## 5. Screen Recording
- Record screen, window, or tab using MediaRecorder API
- Support recordings up to 6 hours
- Resolution up to 4K (dependent on user's screen)
- Record in WebM or MP4 format (user selectable)
- Live recording controls: pause, resume, stop
- Use annotation tools (draw, text, shapes) while recording via a floating toolbar overlay

## 6. Video Editor
- Trim/cut recordings with a timeline scrubber
- Add text overlays and shapes on the video
- Preview edits before saving
- Save edited version as a new file

## 7. Format Conversion
- Convert WebM recordings to MP4 (using FFmpeg.wasm in-browser)
- Download in either WebM or MP4

## 8. File Management & Storage
- All screenshots and recordings saved to Supabase Storage
- Organize with folders or tags
- Search and filter by date, type, or name
- Download any file locally
- Delete to trash with 30-day recovery period

## 9. Backend (Supabase / Lovable Cloud)
- **Auth**: Email/password authentication
- **Database**: Tables for users, profiles, media files (metadata), trash
- **Storage**: Buckets for screenshots and recordings with RLS policies
- **Edge Functions**: Format conversion processing if needed

