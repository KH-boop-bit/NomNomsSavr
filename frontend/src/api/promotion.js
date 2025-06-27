import axios from "axios";
import qs from 'qs';
import { ACCESS_TOKEN } from "../constants";

//const fallbackApiUrl = "/choreo-apis/awbo/backend/rest-api-be2/v1.0";

const apiUrl = import.meta.env.VITE_API_URL //|| fallbackApiUrl;

const promotions = axios.create({
  baseURL: apiUrl,
  paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat'}) //removes [] from GET query since django expects deal_type instead of deal_type[] default
});

promotions.interceptors.request.use(
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

export default promotions;

export const promotionsApi = {
  getAllPromotions: (params = {}) => promotions.get("/promotions/", { params }), //pass filters in when getting promotions in params
};