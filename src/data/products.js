import distressedTee from "../../clothing/shirts/1shirt.png";
import stillHereTee from "../../clothing/shirts/2shirt.png";
import smallerWorldTee from "../../clothing/shirts/3shirt.png";
import goodThingsTee from "../../clothing/shirts/4shirt.png";
import differentDayTee from "../../clothing/shirts/5shirt.png";
import cargoDenim from "../../clothing/pants/1pants.png";
import washedDenim from "../../clothing/pants/2pants.png";
import graphicDenim from "../../clothing/pants/3pants.png";
import heroBackground from "../../clothing/bg/dog.png";
import topsCampaign from "../../clothing/bg/shirtsall.png";
import bottomsCampaign from "../../clothing/bg/pantsall.png";

// Original supplied files are imported directly; Vite handles production URLs.
// All prices and stock quantities are temporary.
// The first image is the catalog cover; additional entries can hold alternate views.
// Stock is a quantity per size, ready for real inventory values later.
export const products = [
  {
    id: "001",
    name: "1999 Distressed Tee",
    price: 699,
    category: "tops",
    images: [distressedTee],
    description:
      "An oversized everyday tee with a washed finish and distressed 1999 graphic.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Washed black",
  },
  {
    id: "002",
    name: "Still Here Tee",
    price: 699,
    category: "tops",
    images: [stillHereTee],
    description:
      "A faded charcoal graphic tee with a relaxed, lived-in silhouette.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Faded charcoal",
  },
  {
    id: "003",
    name: "Smaller World Tee",
    price: 749,
    category: "tops",
    images: [smallerWorldTee],
    description:
      "A vintage cream oversized tee for a smaller world and bigger dreams.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Vintage cream",
  },
  {
    id: "004",
    name: "Good Things Tee",
    price: 699,
    category: "tops",
    images: [goodThingsTee],
    description:
      "A distressed brown tee with a vintage-inspired graphic and easy fit.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Distressed brown",
  },
  {
    id: "005",
    name: "Different Day Tee",
    category: "tops",
    price: 749,
    images: [differentDayTee],
    description:
      "A faded gray graphic tee with dropped shoulders and an oversized cut.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Faded gray",
  },
  {
    id: "006",
    name: "1999 Cargo Denim",
    category: "bottoms",
    price: 1499,
    images: [cargoDenim],
    description:
      "Baggy cargo denim with utility pockets and a washed charcoal finish.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Washed charcoal",
  },
  {
    id: "007",
    name: "1999 Washed Denim",
    category: "bottoms",
    price: 1399,
    images: [washedDenim],
    description:
      "Wide-leg denim with a faded wash and subtle distressed details.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Faded stone",
  },
  {
    id: "008",
    name: "1999 Graphic Denim",
    category: "bottoms",
    price: 1599,
    images: [graphicDenim],
    description: "Washed black baggy denim with statement 1999 graphics.",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 10, M: 10, L: 10, XL: 10 },
    color: "Washed black",
  },
];
// Temporary shared information, editable here until final specifications arrive.
export const productInformation = {
  tops: {
    details:
      "An oversized silhouette for everyday rotation. Final fabric composition and care instructions will be added before launch.",
    sizeGuide:
      "Available in S, M, L, and XL. The intended fit is oversized. Exact garment measurements will be added before launch.",
  },
  bottoms: {
    details:
      "A relaxed, baggy silhouette made for your everyday uniform. Final fabric composition and care instructions will be added before launch.",
    sizeGuide:
      "Available in S, M, L, and XL. The intended fit is baggy. Exact waist, rise, and inseam measurements will be added before launch.",
  },
  shippingReturns:
    "Shipping rates, delivery estimates, and return conditions will be available before launch.",
};

export const campaignImages = {
  hero: heroBackground,
  editorial:
    "https://images.unsplash.com/photo-1529139513065-c3b3d989f25b?auto=format&fit=crop&w=1600&q=85",
  tops: topsCampaign,
  bottoms: bottomsCampaign,
};
