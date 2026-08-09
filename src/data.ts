export type Review = {
  id: number;
  author: string;
  rating: number;
  date: string;
  comment: string;
  status?: "pending" | "approved" | "spam";
};

export type SizeChartRow = {
  size: string;
  chest?: string;
  waist?: string;
  hips?: string;
  length?: string;
  inseam?: string;
  [key: string]: string | undefined;
};

export type SizeChart = {
  unit: "in" | "cm";
  columns: string[]; // e.g. ["Size", "Chest", "Waist", "Hips"]
  rows: SizeChartRow[];
  notes?: string;
};

export type Product = {
  id: number;
  name: string;
  slug?: string;
  category: "New" | "Clothing" | "Accessories" | "Sale";
  productType?: string;
  price: number;
  compareAt?: number;
  badge?: string;
  colors: string[];
  image: string;
  images: string[];
  alt: string;
  sizes: string[];
  description: string;
  details: string[];
  care: string[];
  rating: number;
  reviews: Review[];
  inventory?: Record<string, number>; // Format: "color_size" -> quantity
  sizeChart?: SizeChart;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
};

export type Collection = {
  title: string;
  kicker: string;
  image: string;
  alt: string;
};

export type JournalArticle = {
  id: number;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  content: string[];
  image: string;
};

export const heroProducts: Product[] = [
  {
    id: 17,
    name: "VESTIGIA Aurelius Oversized Tee - Black",
    slug: "vestigia-aurelius-oversized-tee-black",
    category: "Clothing",
    productType: "Premium Heavyweight Oversized T-Shirt",
    price: 79.99,
    badge: "First Release",
    colors: ["Black"],
    image: "/uploads/1784373355678-vestigia-black-oversized-tshirt-model-main.png",
    images: [
      "/uploads/1784373355678-vestigia-black-oversized-tshirt-model-main.png",
      "/uploads/1784373364148-vestigia-black-oversized-tshirt-model-front.png",
      "/uploads/1784373366893-vestigia-black-oversized-tshirt-model-back.png",
      "/uploads/1784373369879-vestigia-black-oversized-tshirt-front.png",
      "/uploads/1784373372882-vestigia-black-oversized-tshirt-back.png"
    ],
    alt: "VESTIGIA Aurelius Oversized Tee - Black",
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    description: "VESTIGIA Aurelius Oversized Tee - Black\n\nWhere timeless heritage meets modern streetwear. The Aurelius Oversized Tee features a deep black finish accented with signature gold VESTIGIA detailing, creating a bold yet refined aesthetic.",
    details: [
      "Premium oversized fit",
      "Classic black with gold detailing",
      "Signature VESTIGIA front graphic",
      "Double gold sleeve stripes",
      "Drop-shoulder silhouette",
      "Unisex design"
    ],
    care: [
      "Machine wash cold inside out with similar colors",
      "Hang to dry naturally in shade",
      "Warm iron on reverse side if needed"
    ],
    rating: 4.9,
    reviews: []
  },
  {
    id: 18,
    name: "VESTIGIA Aurelius Oversized Tee - White",
    slug: "vestigia-aurelius-oversized-tee-white",
    category: "Clothing",
    productType: "Premium Heavyweight Oversized T-Shirt",
    price: 79.99,
    badge: "EXCLUSIVE",
    colors: ["White"],
    image: "/uploads/1784380538861-vestigia-white-oversized-tshirt-model-main.png",
    images: [
      "/uploads/1784380538861-vestigia-white-oversized-tshirt-model-main.png",
      "/uploads/1784380541857-vestigia-white-oversized-tshirt-model-front.png",
      "/uploads/1784380546321-vestigia-white-oversized-tshirt-model-back.png",
      "/uploads/1784380554561-vestigia-white-oversized-tshirt-front.png",
      "/uploads/1784380549246-vestigia-white-oversized-tshirt-back.png"
    ],
    alt: "VESTIGIA Aurelius Oversized Tee - White",
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    description: "VESTIGIA Aurelius Oversized Tee - White\n\nWhere timeless heritage meets modern streetwear. The Aurelius Oversized Tee - White features a crisp white finish accented with signature gold VESTIGIA detailing.",
    details: [
      "Premium oversized fit",
      "Classic white with gold detailing",
      "Signature VESTIGIA front graphic",
      "Double gold sleeve stripes",
      "Drop-shoulder silhouette",
      "Unisex design"
    ],
    care: [
      "Machine wash cold inside out with similar colors",
      "Hang to dry naturally in shade",
      "Warm iron on reverse side if needed"
    ],
    rating: 4.9,
    reviews: []
  }
];

export const products: Product[] = [...heroProducts];

export const collections: Collection[] = [];

export const journalArticles: JournalArticle[] = [
  {
    id: 1,
    title: "The Architecture of Weight: Our 280 GSM Heavyweight Jersey",
    date: "June 28, 2026",
    readTime: "4 min read",
    excerpt: "Structure meets drape in our first release. An inquiry into the fabric density that defines the VESTIGIA Signature T-shirt.",
    content: [
      "At VESTIGIA, we believe that fabric is the architecture of garment creation. For our first release, the Signature Tee, we spent months developing a cotton jersey that carries its own form, providing a clean, structured silhouette without compromising on breathability.",
      "The result is our 280 GSM heavyweight cotton. GSM, or grams per square meter, is the standard metric for fabric density. While typical retail T-shirts sit between 130 and 160 GSM, our choice of 280 GSM offers an intentional, heavy feel that hangs beautifully from the shoulders and resists distortion over time.",
      "This density is paired with raw, long-staple cotton fibers spun to minimize hairiness. The knit is tight but breathable, ensuring the garment moves with you through urban environments while retaining the clean lines and visual poise that Italian creative direction demands."
    ],
    image: "/images/products/signature_detail.png"
  },
  {
    id: 2,
    title: "Rome to Colombo: A Design and Craft Exchange",
    date: "June 14, 2026",
    readTime: "3 min read",
    excerpt: "From design studios in Italy to high-precision apparel production in Sri Lanka, VESTIGIA bridges two distinct worlds of garment expertise.",
    content: [
      "The design identity of VESTIGIA is born in Italy—shaped by Mediterranean stone textures, quiet minimalist design traditions, and contemporary streetwear proportions. The visual language of the brand values restraint, focusing on clean lines, deep neutral tones, and subtle markings.",
      "However, the realization of this vision takes place in Sri Lanka. Home to some of the world's most sophisticated and ethical apparel manufacturers, Sri Lanka is a global leader in high-end knitwear and precision garment production.",
      "By combining Italian creative direction with Sri Lankan manufacturing craftsmanship, we create clothing that exists between cultures, place, and expertise. This collaboration results in premium T-shirts with clean stitching, durable constructions, and an authentic origin story."
    ],
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=85"
  },
  {
    id: 3,
    title: "Restraint as a Concept: The Three-Piece Release",
    date: "May 29, 2026",
    readTime: "5 min read",
    excerpt: "Why we chose to launch VESTIGIA with exactly three T-shirts. An editorial exploration of minimalism, focus, and intentional wardrobing.",
    content: [
      "The modern fashion cycle is fast, cluttered, and overwhelming. Brands release dozens of styles each month, urging shoppers to consume constantly. VESTIGIA rejects this approach.",
      "We launched our brand with exactly three garments: the Signature Tee, the Origin Tee, and the Essential Tee. This limitation is not a constraint, but an intentional choice. It represents our commitment to focus, restraint, and quality over sheer volume.",
      "By launching only three T-shirts, we ensure that each piece has been meticulously considered, refined, and tested. Every seam is intentional, every fit is perfected, and every fabric selection is optimized. We offer foundations for a lifetime of wear, designed to remain relevant beyond a single season."
    ],
    image: "/images/products/signature_model.png"
  }
];
