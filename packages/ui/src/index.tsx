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
import { SectionHeading } from './components/SectionHeading';
import { Avatar } from './components/Avatar';
import { Stat } from './components/Stat';
import { ThemeToggle } from './components/ThemeToggle';
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
  wingetCommand,
  installCommands,
  PKG_REPO,
} from './lib/ecosystem';

export {
  MAIN_URL,
  ECOSYSTEM_APPS,
  ECO_GAMES,
  ECO_PLATFORM_LABEL,
  ECO_CATEGORY_LABEL,
  wingetCommand,
  installCommands,
  PKG_REPO,
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
  SectionHeading,
  Avatar,
  Stat,
  ThemeToggle,
  Icon,
  PLATFORM_CHIP_CLASS,
  platformChipClass,
  platformInkClass,
  TableOfContents,
  RecordFooter,
  usePageSize,
  pageAfterResize,
};

export default Layout;

// Kiểu của prop cũng là một phần hợp đồng công khai của design system. Không
// xuất chúng thì nơi dùng buộc phải viết `string` rồi đụng vào union bên trong -
// đúng thứ đã xảy ra với `tone` của Badge ở trang quản trị dự án.
export type { BadgeTone } from './components/Badge';
export type { EcoApp, EcoGame, EcoPlatform, EcoCategory } from './lib/ecosystem';
export type { ButtonSize, ButtonVariant } from './components/Button';
export type { ToastType } from './components/Toast';
export type { IconName, PlatformBrand } from './components/Icon';
export type { TocItem } from './components/TableOfContents';
export type { RecordFooterProps } from './components/RecordFooter';
export type { EmptyStateProps } from './components/EmptyState';
