import { Token } from "@mui/icons-material";
import api, { openApi } from "../../services/api";

const useSettings = () => {
  const getAll = async (params) => {
    const { data } = await api.request({
      url: "/settings",
      method: "GET",
      params,
    });
    return data;
  };

  const update = async (data) => {
    const { data: responseData } = await api.request({
      url: `/settings/${data.key}`,
      method: "PUT",
      data,
    });

    const companyId = localStorage.getItem("companyId") || "global";
    const cacheKey = `setting_${companyId}_${data.key}`;

    localStorage.setItem(cacheKey, JSON.stringify(responseData.value));

    return responseData;
  };

  const get = async (param) => {
    const { data } = await api.request({
      url: `/setting/${param}`,
      method: "GET",
    });
    return data;
  };

  const getPublicSetting = async (key, companyId = null) => {
    console.log(`COMPANYID:${companyId}`);
    const cacheKey = `setting_${companyId || "global"}_${key}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached !== null) {
      try {
        const parsed = JSON.parse(cached);

        if (parsed !== "" && parsed !== null && parsed !== undefined) {
          return parsed;
        }

        localStorage.removeItem(cacheKey);
      } catch (error) {
        localStorage.removeItem(cacheKey);
      }
    }

    const params = {
      token: process.env.REACT_APP_ENV_TOKEN,
    };

    if (companyId) {
      params.companyId = companyId;
    }

    const { data } = await openApi.request({
      url: `/public-settings/${key}`,
      method: "GET",
      params,
    });

    if (data !== "" && data !== null && data !== undefined) {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } else {
      localStorage.removeItem(cacheKey);
    }

    return data;
  };

  return {
    getAll,
    update,
    get,
    getPublicSetting,
  };
};

export default useSettings;
