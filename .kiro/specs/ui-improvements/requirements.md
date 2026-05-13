# Requirements Document

## Introduction

This document specifies three UI improvements for the Territory Map application: a floating color legend overlay on the map, a mobile quick-switch alliance bar, and a multi-step undo/redo history stack. These enhancements improve usability by providing at-a-glance alliance information, faster mobile interaction, and the ability to reverse accidental actions.

## Glossary

- **Map_View**: The main SVG-based interactive map area where territory regions are displayed and can be clicked to assign alliances.
- **Alliance**: A named group with an assigned color that can claim territories on the map.
- **Color_Legend**: A floating semi-transparent overlay panel displayed on the Map_View showing alliance names paired with their color swatches.
- **Quick_Switch_Bar**: A floating horizontal bar displayed at the bottom of the screen on mobile viewports, containing colored chips representing each alliance.
- **Active_Alliance**: The currently selected alliance that will be assigned when a user clicks a territory region.
- **Action_History**: An ordered stack of recorded user actions (territory assignments and removals) that supports stepping backward and forward.
- **Territory_Assignment**: The act of associating a territory region with an alliance.
- **Territory_Removal**: The act of removing an alliance association from a territory region.
- **Undo_Operation**: Reversing the most recent action in the Action_History by restoring the previous state of the affected territory.
- **Redo_Operation**: Re-applying a previously undone action from the Action_History.

## Requirements

### Requirement 1: Floating Color Legend Display

**User Story:** As a map viewer, I want to see a color legend on the map showing which color belongs to which alliance, so that I can quickly identify territory ownership without opening the sidebar.

#### Acceptance Criteria

1. THE Color_Legend SHALL display as a semi-transparent overlay positioned in the bottom-left corner of the Map_View.
2. WHEN at least one territory is assigned to an alliance, THE Color_Legend SHALL display that alliance name alongside its color swatch.
3. WHEN no territories are assigned to any alliance, THE Color_Legend SHALL be hidden from the Map_View.
4. WHEN a territory is assigned to or removed from an alliance, THE Color_Legend SHALL update its displayed entries within the same render cycle.
5. THE Color_Legend SHALL not intercept pointer events on the underlying map regions.
6. THE Color_Legend SHALL remain visible and correctly positioned during pinch-to-zoom and pan interactions on the Map_View.

### Requirement 2: Mobile Quick-Switch Alliance Bar

**User Story:** As a mobile user, I want to quickly switch the active alliance by tapping a colored chip at the bottom of the screen, so that I can assign territories without opening the sidebar.

#### Acceptance Criteria

1. WHILE the viewport width is 768 pixels or less, THE Quick_Switch_Bar SHALL be visible as a floating bar at the bottom of the screen.
2. WHILE the viewport width is greater than 768 pixels, THE Quick_Switch_Bar SHALL be hidden.
3. THE Quick_Switch_Bar SHALL display one colored chip for each alliance that exists in the alliance list.
4. WHEN a user taps a chip in the Quick_Switch_Bar, THE Quick_Switch_Bar SHALL set the tapped alliance as the Active_Alliance.
5. WHILE an alliance is the Active_Alliance, THE Quick_Switch_Bar SHALL visually distinguish the corresponding chip from the other chips.
6. WHEN an alliance is added or removed from the alliance list, THE Quick_Switch_Bar SHALL update its displayed chips within the same render cycle.
7. THE Quick_Switch_Bar SHALL not overlap or obscure the Color_Legend on mobile viewports.

### Requirement 3: Multi-Step Undo/Redo

**User Story:** As a map editor, I want to undo and redo multiple territory assignment actions, so that I can correct mistakes without manually reassigning territories.

#### Acceptance Criteria

1. WHEN a user assigns a territory to an alliance, THE Action_History SHALL record the Territory_Assignment as a new entry.
2. WHEN a user removes an alliance from a territory, THE Action_History SHALL record the Territory_Removal as a new entry.
3. THE Action_History SHALL retain a maximum of 20 action entries.
4. WHEN the Action_History exceeds 20 entries, THE Action_History SHALL discard the oldest entry.
5. WHEN a user performs a new action after an Undo_Operation, THE Action_History SHALL discard all entries ahead of the current position.
6. WHEN a user activates the Undo_Operation, THE Action_History SHALL revert the most recent action by restoring the affected territory to its prior state.
7. WHEN a user activates the Redo_Operation, THE Action_History SHALL re-apply the next undone action by restoring the affected territory to its post-action state.
8. IF no actions exist in the Action_History to undo, THEN THE Undo button SHALL be visually disabled and non-interactive.
9. IF no actions exist in the Action_History to redo, THEN THE Redo button SHALL be visually disabled and non-interactive.
10. THE Undo and Redo buttons SHALL be displayed in the map header area and remain accessible on both desktop and mobile viewports.
11. WHEN an Undo_Operation or Redo_Operation modifies territory state, THE Map_View SHALL reflect the change immediately.
12. WHEN an Undo_Operation or Redo_Operation modifies territory state, THE Action_History change SHALL be persisted to localStorage alongside the current map state.
