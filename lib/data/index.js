// Every page and action reads/writes through these functions,
// so the same UI runs on Supabase or on fake demo data.
import { DEMO } from "@/lib/demo";
import * as mock from "./mock";
import * as supabase from "./supabase";

const impl = DEMO ? mock : supabase;

export const {
  getProfile,
  saveProfile,
  getDeck,
  getMyProducts,
  createProduct,
  updateProduct,
  uploadImage,
  setProductHidden,
  countRecentRightSwipes,
  getProductWithOwner,
  insertSwipe,
  getAdminData,
  getBuilderCandidates,
  insertBuilderLike,
  hasRightLike,
  createChat,
  getChats,
  getChat,
  getMessages,
  insertMessage,
  setChatStatus,
  touchChat,
  countRecentMessages,
  countUnreadChats,
} = impl;
