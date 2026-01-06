import { useDomainAction } from "../../hooks/useDomainAction";
import { getItemByBarcode, createCountLine, getCountLines } from "./services";
import { CreateCountLinePayload } from "./types";

/**
 * Hook for looking up items by barcode.
 * Usage:
 * const { execute: lookupItem, isLoading, error, data: item } = useItemLookup();
 * await lookupItem('123456');
 */
export const useItemLookup = () => {
  return useDomainAction({
    action: getItemByBarcode,
    // No success callback by default as this is a query
  });
};

/**
 * Hook for submitting a count line.
 * Usage:
 * const { execute: submitCount, isLoading, error } = useSubmitCount();
 * await submitCount(payload);
 */
export const useSubmitCount = () => {
  return useDomainAction({
    action: createCountLine,
    // Add onSuccess/onError handlers as needed
  });
};

/**
 * Hook for fetching count lines for a session.
 * Usage:
 * const { execute: fetchLines, isLoading, error, data } = useCountLines();
 * useEffect(() => { fetchLines(sessionId); }, [sessionId]);
 */
export const useCountLines = () => {
  return useDomainAction({
    action: getCountLines,
  });
};
