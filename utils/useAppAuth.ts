// import { useState } from "react";
// import base64 from "base-64";
// import Constants from "expo-constants";

// interface TokenResponse {
//   access_token: string;
//   token_type: string;
//   expires_in: number;
//   scope?: string;
// }

// interface UseAuthReturn {
//   accessToken: string | null;
//   loading: boolean;
//   error: string | null;
//   fetchAccessToken: (endpointSuffix: string) => Promise<string | null>;
// }

// const useAppAuth = (): UseAuthReturn => {
//   const [accessToken, setAccessToken] = useState<string | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   const clientId = Constants.expoConfig?.extra?.CLIENT_ID;
//   const clientSecret = Constants.expoConfig?.extra?.CLIENT_SECRET;
//   const tokenUrl = Constants.expoConfig?.extra?.ACCESS_TOKEN_URL;
//   const baseScopeUrl = Constants.expoConfig?.extra?.BASE_SCOPE_URL;

//   const fetchAccessToken = async (
//     endpointSuffix: string
//   ): Promise<string | null> => {
//     setLoading(true);
//     setError(null);

//     const fullScope = `${baseScopeUrl}/${endpointSuffix}`;
//     console.log("🔑 Requesting scope:", fullScope);

//     try {
//       const response = await fetch(tokenUrl, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//           Authorization: `Basic ${base64.encode(
//             `${clientId}:${clientSecret}`
//           )}`,
//           "User-Agent": "PostmanRuntime/7.32.2",
//         },
//         body: new URLSearchParams({
//           grant_type: "client_credentials",
//           scope: fullScope,
//         }).toString(),
//       });

//       const data = (await response.json()) as Partial<TokenResponse> & {
//         error?: string;
//         error_description?: string;
//       };

//       if (response.ok && data.access_token) {
//         setAccessToken(data.access_token);
//         return data.access_token;
//       } else {
//         setError(
//           data.error_description || data.error || `Failed: ${response.status}`
//         );
//         return null;
//       }
//     } catch (err: any) {
//       console.error("❌ Fetch error:", err);
//       setError(err.message || "Network error");
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     accessToken,
//     loading,
//     error,
//     fetchAccessToken,
//   };
// };

// export default useAppAuth;
