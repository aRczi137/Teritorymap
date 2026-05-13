# Requirements Document

## Introduction

This feature adds a "Discord Export" capability to the Territory Map application. It allows users to export the current map statistics (alliance scores, territory counts, and buff summaries) as a Discord-formatted message and copy it to the clipboard for easy pasting into Discord channels.

## Glossary

- **Export_Button**: The UI button that triggers the Discord message generation and clipboard copy operation
- **Discord_Message_Formatter**: The module responsible for converting map statistics into a Discord markdown-formatted text string
- **Clipboard_Service**: The browser Clipboard API used to copy the formatted message to the user's system clipboard
- **Alliance**: A named group that owns territories on the map, identified by a unique ID, name, and color
- **Territory**: A region on the map that can be assigned to an alliance, each with a point value
- **Buff**: A bonus effect associated with a territory, aggregated per alliance
- **Alliance_Score**: The total point value of all territories owned by an alliance

## Requirements

### Requirement 1: Export Button Placement

**User Story:** As a user, I want to see a clearly labeled export button in the sidebar, so that I can easily trigger the Discord export action.

#### Acceptance Criteria

1. THE Export_Button SHALL be rendered in the Actions section of the sidebar, positioned between the "Export as PNG" button and the "Map reset" button
2. THE Export_Button SHALL display a clipboard or share icon and the text label "Copy for Discord", using the same full-width button styling (padding, font weight, border radius, and flex layout) as the existing "Export as PNG" button
3. THE Export_Button SHALL be visible and interactive on desktop (sidebar always visible) and on mobile (when the sidebar is toggled open), matching the responsive behavior of the other sidebar buttons
4. THE Export_Button SHALL be keyboard-focusable and include an accessible label of "Copy for Discord"

### Requirement 2: Discord Message Formatting

**User Story:** As a user, I want the exported message to be formatted with Discord markdown, so that it renders nicely when pasted into a Discord channel.

#### Acceptance Criteria

1. WHEN the user activates the Export_Button, THE Discord_Message_Formatter SHALL generate a text string using Discord markdown syntax (bold with **, code blocks with ```, and emoji characters)
2. THE Discord_Message_Formatter SHALL include a header section with the title "Territory Map Summary"
3. THE Discord_Message_Formatter SHALL include the total number of territories, the number of assigned territories, and the number of free territories
4. THE Discord_Message_Formatter SHALL include a ranked list of alliances sorted by Alliance_Score in descending order, showing each alliance name and its score
5. THE Discord_Message_Formatter SHALL include the territory count for each alliance displayed as the number of territories owned out of the total available territories
6. THE Discord_Message_Formatter SHALL include the aggregated buff summary for each alliance that owns at least one territory with a buff, computed by summing percentage values of each buff type across owned territories
7. WHEN two or more alliances have the same Alliance_Score, THE Discord_Message_Formatter SHALL sort them alphabetically by alliance name
8. THE Discord_Message_Formatter SHALL output sections in the following order: header, territory overview, alliance rankings, buff summary

### Requirement 3: Clipboard Copy Operation

**User Story:** As a user, I want the formatted message to be copied to my clipboard automatically, so that I can paste it directly into Discord without manual selection.

#### Acceptance Criteria

1. WHEN the user activates the Export_Button, THE Clipboard_Service SHALL copy the generated Discord-formatted message to the system clipboard using the browser Clipboard API
2. WHEN the clipboard copy operation succeeds, THE Export_Button SHALL display a temporary success indicator (text change or visual feedback) for 2 seconds, then revert to its default label and state
3. IF the clipboard copy operation fails, THEN THE Export_Button SHALL display an error indication informing the user that the copy failed for 3 seconds, then revert to its default label and state
4. IF no alliances currently own any territories at the time of export, THEN THE Export_Button SHALL still copy the formatted message containing zero scores and territory counts

### Requirement 4: Message Content Accuracy

**User Story:** As a user, I want the exported message to reflect the current state of the map, so that the information I share is accurate.

#### Acceptance Criteria

1. WHEN the user activates the Export_Button, THE Discord_Message_Formatter SHALL read the current regionColors state and calculate territory counts and alliance scores at that instant, without using any cached or previously computed values
2. THE Discord_Message_Formatter SHALL only include alliances that currently exist in the alliances state, and SHALL exclude any region ownership entries in regionColors that reference an alliance ID no longer present in the alliances state
3. WHEN the user activates the Export_Button, THE Discord_Message_Formatter SHALL compute buff aggregations by summing the percentage values of each buff type across all territories owned by each alliance, using the current regionColors and PERMANENT_BUFFS mapping at that instant
4. THE Discord_Message_Formatter SHALL include alliances that own zero territories in the ranked list with a score of 0, so that all active alliances are visible in the export
5. THE Discord_Message_Formatter SHALL calculate each alliance's score as the sum of the point values (region number field) of all territories currently assigned to that alliance in regionColors
