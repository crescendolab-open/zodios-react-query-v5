import urlJoin from "url-join";

export const baseUrl = window.location.origin;
export const apiPath = "/api";
export const apiUrl = urlJoin(baseUrl, apiPath);
