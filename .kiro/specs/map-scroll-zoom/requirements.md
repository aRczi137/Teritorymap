# Requirements Document

## Introduction

Add scroll-wheel zoom capability to the Territory Map view (AllianceMapManager) on desktop. The scroll-wheel zoom reuses the existing `mapScale` / `mapTranslate` state and zoom range (1×–5×), zooms toward the cursor position (anchor-point zoom like Google Maps), and only affects the map container — not the sidebar or any other UI. The existing hint text is updated to inform desktop users about the scroll-wheel interaction.

## Glossary

- **Map_Container**: The `<div ref={mapContainerRef}>` element in `AllianceMapManager.tsx` that wraps the SVG map and receives CSS `transform: scale(...) translate(...)`.
- **Map_View**: The territory map rendered inside `AllianceMapManager.tsx`, consisting of the SVG with `viewBox="0 0 1116 910"` and its container.
- **Scroll_Zoom_Handler**: The wheel-event callback that computes new scale and translation values in response to scroll-wheel input.
- **Zoom_Scale**: The `mapScale` state value representing the current magnification level (range 1–5).
- **Zoom_Translation**: The `mapTranslate` state value `{ x, y }` representing the current pan offset of the map.
- **Cursor_Anchor**: The position of the mouse cursor relative to the Map_Container at the moment a wheel event fires, used as the focal point for zoom.
- **Hint_Text**: The `<span>` elements at the bottom of the map panel that display contextual usage tips to the user.

## Requirements

### Requirement 1: Scroll-wheel zoom activation

**User Story:** As a desktop user, I want to zoom the territory map by scrolling my mouse wheel, so that I can inspect regions without using pinch gestures.

#### Acceptance Criteria

1. WHEN the user scrolls the mouse wheel downward over the Map_Container, THE Scroll_Zoom_Handler SHALL decrease the Zoom_Scale by a multiplicative factor.
2. WHEN the user scrolls the mouse wheel upward over the Map_Container, THE Scroll_Zoom_Handler SHALL increase the Zoom_Scale by a multiplicative factor.
3. THE Scroll_Zoom_Handler SHALL register a non-passive wheel event listener on the Map_Container to prevent the default page scroll behavior.

### Requirement 2: Zoom toward cursor position

**User Story:** As a desktop user, I want the map to zoom toward my cursor position, so that the area I'm looking at stays centered during zoom.

#### Acceptance Criteria

1. WHEN a wheel event fires, THE Scroll_Zoom_Handler SHALL compute the Cursor_Anchor as the mouse position relative to the Map_Container bounding rectangle.
2. WHEN the Zoom_Scale changes, THE Scroll_Zoom_Handler SHALL adjust the Zoom_Translation so that the map point under the Cursor_Anchor remains visually stationary.

### Requirement 3: Zoom range clamping

**User Story:** As a desktop user, I want the zoom to stay within safe bounds, so that I cannot over-zoom or under-zoom the map.

#### Acceptance Criteria

1. THE Scroll_Zoom_Handler SHALL clamp the Zoom_Scale to a minimum value of 1.
2. THE Scroll_Zoom_Handler SHALL clamp the Zoom_Scale to a maximum value of 5.
3. WHEN the Zoom_Scale is clamped back to below 1.1, THE Scroll_Zoom_Handler SHALL reset the Zoom_Scale to 1 and the Zoom_Translation to `{ x: 0, y: 0 }`.

### Requirement 4: Zoom scoped to map only

**User Story:** As a desktop user, I want only the map area to zoom, so that the sidebar and other UI elements remain unchanged.

#### Acceptance Criteria

1. THE Scroll_Zoom_Handler SHALL apply the Zoom_Scale and Zoom_Translation exclusively to the Map_Container CSS transform.
2. WHEN the user scrolls the wheel over the Map_Container, THE Scroll_Zoom_Handler SHALL call `preventDefault()` on the wheel event to prevent page-level scrolling.
3. WHILE the cursor is outside the Map_Container, THE Map_View SHALL ignore wheel events and allow default browser scroll behavior.

### Requirement 5: Smooth zoom transition

**User Story:** As a desktop user, I want zoom transitions to feel fluid, so that the map interaction is comfortable.

#### Acceptance Criteria

1. WHILE the user is actively scrolling (wheel events firing), THE Map_Container SHALL disable CSS transition on the transform property to avoid input lag.
2. WHEN the user stops scrolling, THE Map_Container SHALL re-enable the CSS transition on the transform property for smooth visual settling.

### Requirement 6: Hint text update

**User Story:** As a desktop user, I want to see a hint about scroll-wheel zoom, so that I know the feature is available.

#### Acceptance Criteria

1. WHILE the Zoom_Scale equals 1, THE Hint_Text SHALL display "Scroll to zoom" on desktop viewports (md breakpoint and above).
2. WHILE the Zoom_Scale is greater than 1, THE Hint_Text SHALL display the current zoom percentage.
3. WHILE on mobile viewports (below md breakpoint), THE Hint_Text SHALL continue to display "Pinch to zoom" when the Zoom_Scale equals 1.
