// Every page and action reads/writes through these functions,
// so the same UI runs on Supabase or on fake demo data.
// Demo is decided per request (see lib/demo.js), so each function checks before picking a backend.
import { demoSandbox } from "@/lib/demo";
import * as mock from "./mock";
import * as supabase from "./supabase";

const route =
  (name) =>
  async (...args) => {
    const sandbox = await demoSandbox();
    return sandbox ? mock.inSandbox(sandbox, () => mock[name](...args)) : supabase[name](...args);
  };

export const getProfile = route("getProfile");
export const saveProfile = route("saveProfile");
export const getGitHubProfile = route("getGitHubProfile");
export const saveGitHubProfile = route("saveGitHubProfile");
export const deleteGitHubProfile = route("deleteGitHubProfile");
export const getDeck = route("getDeck");
export const getMyProducts = route("getMyProducts");
export const createProduct = route("createProduct");
export const updateProduct = route("updateProduct");
export const uploadImage = route("uploadImage");
export const setProductHidden = route("setProductHidden");
export const countRecentRightSwipes = route("countRecentRightSwipes");
export const getProductWithOwner = route("getProductWithOwner");
export const insertSwipe = route("insertSwipe");
export const getAdminData = route("getAdminData");
export const getBuilderCandidates = route("getBuilderCandidates");
export const insertBuilderLike = route("insertBuilderLike");
export const hasRightLike = route("hasRightLike");
export const createChat = route("createChat");
export const getChats = route("getChats");
export const getChat = route("getChat");
export const getMessages = route("getMessages");
export const insertMessage = route("insertMessage");
export const setChatStatus = route("setChatStatus");
export const touchChat = route("touchChat");
export const countRecentMessages = route("countRecentMessages");
export const countUnreadChats = route("countUnreadChats");
