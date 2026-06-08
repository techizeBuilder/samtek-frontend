import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { config } from '../config/environment';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorData: any = null;
    
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await res.json();
        // Extract clean error message from response
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else {
        const text = await res.text();
        if (text && text.trim()) {
          errorMessage = text;
        }
      }
    } catch (parseError) {
      // If we can't parse the response, use status text
      console.warn('Could not parse error response:', parseError);
    }
    
    // Create error with clean message AND preserve data field
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    if (errorData) {
      (error as any).data = errorData.data || null;
      (error as any).responseData = errorData;
    }
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const token = localStorage.getItem('token');
  
  // Add base URL if not already present - use environment config
  const baseURL = config.baseURL;
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
  
  console.log(`API Request: ${method} ${fullUrl}`, data ? (data instanceof FormData ? 'FormData' : data) : '(no data)');
  console.log('Token available:', token ? 'Yes' : 'No');

  // Prepare headers - different for FormData vs JSON
  const headers: HeadersInit = {
    "Accept": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` })
  };

  // Only add Content-Type for non-FormData requests
  if (!(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Prepare body - different for FormData vs JSON
  let body: string | FormData | undefined;
  if (data) {
    if (data instanceof FormData) {
      body = data; // Send FormData directly
    } else {
      body = JSON.stringify(data); // Stringify other data
    }
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
    credentials: "include",
  });

  console.log(`API Response: ${res.status} ${res.statusText}`);
  
  // Check if response is HTML (404 page) instead of JSON
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    console.error('Received HTML instead of JSON - likely 404 or routing issue');
    throw new Error(`404: ${method} ${fullUrl} - Route not found`);
  }

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    
    console.log(`Query Request: GET ${queryKey[0]}`);
    console.log('Token available:', token ? 'Yes' : 'No');

    const res = await fetch(queryKey[0] as string, {
      headers: {
        "Accept": "application/json",
        ...(token && { "Authorization": `Bearer ${token}` })
      },
      credentials: "include",
    });

    console.log(`Query Response: ${res.status} ${res.statusText}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Check if response is HTML (404 page) instead of JSON
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML instead of JSON - likely 404 or routing issue');
      throw new Error(`404: GET ${queryKey[0]} - Route not found`);
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
