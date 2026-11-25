import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';
import { Button } from './components/Button';
import { Container } from './components/Container';
import { Layout } from './components/Layout';
import { Article } from './components/Article';
import { Upload } from './components/Upload';
import { Input } from './components/Input';
import { Card } from './components/Card';
import { EmptyState } from './components/EmptyState';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { Logo } from './components/Logo';
import { Badge } from './components/Badge';
import { TsuBadge } from './components/TsuBadge';
import { SectionHeading } from './components/SectionHeading';
import { Avatar } from './components/Avatar';
import { Stat } from './components/Stat';
import { ThemeToggle } from './components/ThemeToggle';
import { ProThemePicker } from './components/ProThemePicker';
import { Icon, PLATFORM_CHIP_CLASS, platformChipClass, platformInkClass } from './components/Icon';
import { TableOfContents } from './components/TableOfContents';
import { RecordFooter } from './components/RecordFooter';
import { usePageSize, pageAfterResize } from './lib/usePageSize';
import { MAIN_URL } from './lib/siteUrls';
import {
  ECOSYSTEM_APPS,
  ECO_GAMES,
  ECO_PLATFORM_LABEL,
  ECO_CATEGORY_LABEL,
  installCommands,
  installPlan,
  guessInstallTarget,
  INSTALL_TARGETS,
  PKG_REPO,
  ecoAuthorLine,
} from './lib/ecosystem';

export {
  MAIN_URL,
  ECOSYSTEM_APPS,
  ECO_GAMES,
  ECO_PLATFORM_LABEL,
  ECO_CATEGORY_LABEL,
  installCommands,
  installPlan,
  guessInstallTarget,
  INSTALL_TARGETS,
  PKG_REPO,
  ecoAuthorLine,
  SiteHeader,
  SiteFooter,
  Button,
  Container,
  Layout,
  Article,
  Upload,
  Input,
  Card,
  EmptyState,
  Modal,
  Toast,
  Logo,
  Badge,
  TsuBadge,
  SectionHeading,
  Avatar,
  Stat,
  ThemeToggle,
  ProThemePicker,
  Icon,
  PLATFORM_CHIP_CLASS,
  platformChipClass,
  platformInkClass,
  TableOfContents,
  RecordFooter,
  usePageSize,
  pageAfterResize,
};

export {
  BADGE_CACHE_KEY,
  readBadgeCache,
  writeBadgeCache,
  fetchOwnBadge,
  fetchOwnStatus,
} from './lib/badgeCache';
export {
  PRO_THEME_KEY,
  PRO_OK_KEY,
  PRO_THEMES,
  PRO_THEME_IDS,
  isProThemeId,
  readProTheme,
  setProTheme,
  setProEntitled,
} from './lib/proTheme';
export type { ProThemeId } from './lib/proTheme';

export { AppGateModal } from './components/AppGateModal';
export type { AppGateModalProps } from './components/AppGateModal';
export { GATE_TEXT, gateCopy, compareVersions, xTsuApp, gateFromResponse } from './lib/appGate';
export type { GateKind, GateLang, GateCopy, GateVerdict } from './lib/appGate';
export {
  defineSignInReminder,
  reminderMarkup,
  SIGNIN_REMINDER_TAG,
} from './elements/signinReminder';
export {
  SIGNIN_REMINDER_CADENCE,
  SIGNIN_REMINDER_TEXT,
  WHY_SIGN_IN_URL,
  shouldShowReminder,
  nextEligibleAt,
  loadReminderState,
  saveReminderState,
  clearReminderState,
  markShown,
  markDismissed,
  markSnoozed,
  markSignedOut,
  orderProviders,
} from './lib/signinReminder';
export type {
  ReminderState,
  ReminderContext,
  ReminderVerdict,
  ReminderLang,
  ReminderProvider,
} from './lib/signinReminder';

export default Layout;

// Kiểu của prop cũng là một phần hợp đồng công khai của design system. Không
// xuất chúng thì nơi dùng buộc phải viết `string` rồi đụng vào union bên trong -
// đúng thứ đã xảy ra với `tone` của Badge ở trang quản trị dự án.
export type { BadgeTone } from './components/Badge';
export type { TsuBadgeValue } from './components/TsuBadge';
export type {
  EcoApp,
  EcoGame,
  EcoPlatform,
  EcoCategory,
  Installable,
  InstallTarget,
  InstallPlan,
} from './lib/ecosystem';
export { PRODUCT_PRIMARY } from './lib/productAccents.generated';
export { AUTH_HINT_KEY, saveAuthHint } from './lib/authHint';
export type { AuthHint } from './lib/authHint';
export type { ButtonSize, ButtonVariant } from './components/Button';
export type { ToastType } from './components/Toast';
export type { IconName, PlatformBrand } from './components/Icon';
export type { TocItem } from './components/TableOfContents';
export type { RecordFooterProps } from './components/RecordFooter';
export type { EmptyStateProps } from './components/EmptyState';
