# Claude Design audit: org Grades

Transcribed from frame 1h "Brand audit, every change made" on the Claude Design canvas (screenshots claude-design-10-audit-a.jpg and claude-design-11-audit-b.jpg), plus the notes Claude Design wrote in chat.

## Layout and spacing

- Content now runs from the left edge of the Walia ibex logo (x=32) to the right edge of the logout icon (x=1408). The wireframe ran the right column almost to the window edge.
- Sidebar, left rail, grade book and student record are separated by 64px, with the hairline centred so each side keeps 32px of clear space.
- KPI strip and record stats keep 24px of clear space on each side of every rule. The wireframe used about 16px.
- Enter or edit grade dialog lost its fill, border, radius and shadow. It sits flat in the grade book column under a hairline.

## Controls

- Show council data switch track replaced by text options, Off and On, with the selected option in emerald.
- Search field underline removed. Dialog fields (student, kind of work, score, out of, letter, feedback) lost their underlines and boxes. Selectors are text with a chevron.
- Settings and Cancel stay plain text. Enter grade and Save grade are the only filled emerald buttons, one per group.
- Tabs and filters keep text only selection in emerald, no underline bar or pill.

## Type and casing

- All caps eyebrow labels (Graded members, Cohort, Work kind, Cohort summary, Visibility state, Council summary, By work kind, Grade history, Rubric breakdown, dialog field labels, every table header) changed to sentence case in Plus Jakarta Sans.
- Visibility value moved from uppercase JetBrains Mono to Plus Jakarta Sans, since it is text.
- Sidebar role label changed from EXECUTIVE to Executive.
- Cohort years, scores, letters, counts, points and dates set in JetBrains Mono. Grader names moved to Plus Jakarta Sans.
- Dialog subline names in sans with the date in mono.

## Colour and values

- Selected row (Amara Tesfaye) keeps emerald text, but the score and letter stay neutral, since scores are never coloured.
- Em dash in the Daniel Park grader cell replaced by N/A. Every missing score, letter, grader and feedback reads N/A.
- Arrow glyph after Go to Settings replaced by the Bootstrap arrow icon.
- Only design system tokens are used for colour, radius and type, in both themes.

## Icons

- Every stroke icon swapped to Bootstrap Icons: bell, flag, journal bookmark, search, graph up, broadcast, bookmark, mortarboard, person circle, gear fill, box arrow right, sidebar set, display (pitch), file earmark text (research note), layers (coverage), people (participation), calculator (overall), x lg, chevron down, arrow right.
- Person icon removed from the Score field, where it carried no meaning.

## Sample data

- Profile changed from Mikael Bekele to Rahel Mensah, Executive. Ria Kapoor and Jordan Vale replaced by Jonas Weber and Tomas Alvarez.
- Graders are now executives only: H. Girma (faculty advisor) and R. Mensah, replacing M. Bekele, E. Rossi, D. Park, S. Haile, I. Lindqvist and C. Okoye.
- Counts rebuilt for nine members: graded members 7/9, no grade yet 2, no feedback 1, cohort summary 4/5 and 3/4, council summary 7, 6, 7, 7 graded.
- Amara Tesfaye's graded entries changed from 4 to 5 to match her five grade history rows, which average 89/100.
- Removed as annotations: footer lists, States (examples) strip and the Member view note. The member view and states are drawn as frames 1c to 1g.

## Other notes from Claude Design's chat

- Logo: the Walia ibex is a rough copy traced from the wireframe (the design system only has a pegasus logo). Use the real logo.
- Rule clash "64px between sections" vs "24px beside rules": 64px gaps between main columns with the hairline centred (32px each side); KPI strip and record stats use 24px each side.
- Second pass fixed two overflow problems: KPI labels and values may wrap and shrink so Enter grade stays inside x=1408 (the paused executive frame overflowed), and Grade history columns narrowed with wrapping feedback. Claude Design said a final preview check was still running when its last message ended.
- It asked whether to add screenshots to the handoff package; not answered.
