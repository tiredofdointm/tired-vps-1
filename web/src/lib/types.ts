export interface User {
  id: string;
  email: string;
  name: string;
  handle: string;
  roles: string[];
  bio: string;
  avatarId: string | null;
  bannerCoverIds: string[];
  accent: string;
  location: { city: string; lat: number; lng: number } | null;
  prefs: { reducedMotion?: boolean; emailUpdates?: boolean };
  createdAt: number;
}

export interface Venue {
  name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  announced: boolean;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  startsAt: number;
  endsAt: number;
  venue: Venue;
  venuePublic: Venue;
  priceFrom: number;
  tags: string[];
  coverIds: string[];
  galleryId: string | null;
  featured: boolean;
  status: string;
  capacity: number;
  ticketsSold: number;
  hostId: string;
  hostName: string;
  going: number;
  isMine: boolean;
  distanceKm?: number;
}

export interface Service {
  id: string;
  title: string;
  category: string;
  description: string;
  priceFrom: number;
  rating: number;
  coverIds: string[];
  providerId: string;
  providerName: string;
}

export interface Photo {
  id: string;
  name: string;
  originalName: string;
  folder: string;
  relPath: string;
  ext: string;
  size: number;
  mtime: number;
  w: number;
  h: number;
  pinned: boolean;
  favorite: boolean;
  hidden: boolean;
  tags: string[];
  renamed: boolean;
}

export interface Gallery {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  photoIds: string[];
  pinnedIds: string[];
  coverIds: string[];
  showcase: boolean;
  count: number;
  createdAt: number;
  updatedAt: number;
}

export interface Ticket {
  id: string;
  userId: string;
  eventId: string;
  type: string;
  code: string;
  purchasedAt: number;
  status: 'valid' | 'used' | 'refunded';
  event: EventItem | null;
}

export interface OrderLine {
  kind: 'ticket' | 'service';
  refId: string;
  title: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderLine[];
  total: number;
  status: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string;
  createdAt: number;
  readAt: number | null;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  photoIds: string[];
  eventId: string | null;
  createdAt: number;
  likes: number;
  liked: boolean;
  event: EventItem | null;
}

export interface FolderInfo {
  folder: string;
  count: number;
  coverId: string | null;
  bytes: number;
}

export interface CartItem {
  kind: 'ticket' | 'service';
  refId: string;
  title: string;
  qty: number;
  unitPrice: number;
  coverId: string | null;
}

export interface DashboardData {
  user: User;
  stats: { tickets: number; upcoming: number; orders: number; unread: number };
  upcoming: Ticket[];
  nearby: EventItem[];
  featured: EventItem[];
  host: {
    events: EventItem[];
    revenue: number;
    ticketsSold: number;
    recentOrders: Order[];
    salesByDay: Record<string, number>;
    services: Service[];
  } | null;
}
