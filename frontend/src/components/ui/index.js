/*
 |==========================================================================
 | UI barrel
 |==========================================================================
 | Single import point for the primitives, so pages read as
 | `import { Card, Button, Badge } from "../components/ui"` rather than five
 | separate paths.
 */

export { default as Button, MagneticButton } from "./Button";
export { default as Card, CardHeader, StatTile } from "./Card";

export {
    Field, Input, TextArea, Select,
    PasswordInput, StrengthMeter, scorePassword,
    Switch, SwitchRow
} from "./Field";

export {
    Badge, VerdictBadge, DifficultyBadge, LanguageBadge,
    Chip, LiveBadge, PreviewBadge
} from "./Badge";

export {
    Skeleton, SkeletonText, SkeletonCard, SkeletonGrid, SkeletonRows,
    Spinner, RouteFallback, EmptyState, ErrorState
} from "./Feedback";

export { default as CodeInput } from "./CodeInput";
export { default as Markdown } from "./Markdown";
export { Modal, ConfirmDialog, Drawer } from "./Overlay";
export { Tabs, TabPanel, Segmented, Avatar, avatarGradient, ProgressBar } from "./Nav";
