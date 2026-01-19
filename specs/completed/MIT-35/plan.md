MIT-27: Friendly dates for notes + months left for expiry
- Create formatNoteTimestamp(ts) in time.js: "Just now" / "5m ago" / "1h ago" for today (no time suffix), "Yesterday at 3:45 PM", "Apr 7, 2025 at 3:45 PM" for older
- Update daysLeft() to return "X months left" when >30 days
- Replace formatTimestamp() in RequestCard.vue with the new function

MIT-31: Show full input when text exists
- Update showControls computed in AddRequestForm.vue to include form.title.trim() check

MIT-26: Notes section full-width (remove nested card)
- Remove the outer div.rounded-2xl.bg-card-muted.p-4.shadow-sm wrapper around notes section in RequestCard.vue (around line 64)
- Keep "Notes" heading, add note button, and note list at section level
- Adjust spacing/margins for note items
- Note cards keep their current bg-note-bg styling

MIT-21: Keep input focused when selecting duration/priority
- Add @mousedown.prevent and @touchstart.prevent to priority and duration toggle buttons in AddRequestForm.vue
- Add same handlers to dropdown option buttons inside the listbox
- Call inputRef.value?.focus() in selectPriority() and selectDuration() as safety net
- This prevents focus shift so mobile keyboard stays up

MIT-37: Remove "details" references
- Clean up references in Mvp-spec (lines 17, 26, 112, 293, 320-322)
- Update README.md line 10