import { Token } from "@mui/icons-material";
import api, { openApi } from "../../services/api";
import logger from "../../utils/logger";

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

    // const companyId = localStorage.getItem("companyId") || "global";
    const publicCacheKey = `setting_${window.location.hostname}_${data.key}`;
    localStorage.setItem(publicCacheKey, JSON.stringify(responseData.value));

    return responseData;
  };

  const get = async (param) => {
    const { data } = await api.request({
      url: `/setting/${param}`,
      method: "GET",
    });
    return data;
  };

  const getPublicSetting = async (key) => {
    const cacheKey = `setting_${window.location.hostname}_${key}`;
    const cached = localStorage.getItem(cacheKey);

    logger.logInfo(`CACHED`, cached);

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

    // console.log(`2 - useSetting > getPublicSetting > Key:${key}`);

    const { data } = await openApi.request({
      url: `/public-settings/${key}`,
      method: "GET",
      params: {
        token: process.env.REACT_APP_ENV_TOKEN,
        // ✅ Removido: companyId — backend resolve pelo domínio
      },
    });

    // logger.logInfo("/public-Settings reutrn", JSON.stringify(data));

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
