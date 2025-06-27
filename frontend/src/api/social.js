// this is an interceptor that will intercept any request we send and auto add the correct headers so we dont write manually
// axios is used to send request, making axios interceptor. 
// the const api = blah blah allows us to import anyth that is specified in env variable file. Allows us to
// specify the api path to the backend that is in the .env file. Kinda like the path to backend I think.

import axios from "axios";
import { ACCESS_TOKEN } from "../constants";

//const fallbackApiUrl = "/choreo-apis/awbo/backend/rest-api-be2/v1.0";

const apiUrl = import.meta.env.VITE_API_URL //|| fallbackApiUrl;

const social = axios.create({
  baseURL: apiUrl,
});

social.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default social;

// new api route im just leaving here for likes for now
const toggleLike = (postId) => social.post(`/social/posts/${postId}/like/`);

export { toggleLike }

export const accountsApi = {
  getProfile: () => social.get("/social/accounts/profile/"),
  // updateProfile: (data) => social.patch("/social/accounts/profile/", data),
  updateProfile: (data, config = {}) => social.patch("/social/accounts/profile/", data, config),
  changePassword: (data) => social.put("/social/accounts/change-password/", data),
  updateUser: (data) => social.patch("/social/accounts/update/", data),

  followUser: (userId) => social.post(`/social/accounts/follow/${userId}/`, userId),
  publicProfile: (userId) => social.get(`/social/accounts/publicProfile/${userId}/`),
  unfollowUser: (userId) => social.post(`/social/accounts/unfollow/${userId}/`, userId),
};