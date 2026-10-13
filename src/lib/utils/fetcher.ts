export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data");
    // @ts-expect-error error info
    error.info = await res.json();
    // @ts-expect-error error status
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

export function getUrl(path: string = "") {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
  }
  return `http://localhost:3000${path}`;
}
