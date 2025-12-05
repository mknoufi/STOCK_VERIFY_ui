import { useQuery } from "@tanstack/react-query";
import { getSessions } from "../services/api";
import { SESSION_PAGE_SIZE } from "../constants/config";

interface UseSessionsQueryOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export const useSessionsQuery = ({
  page = 1,
  pageSize = SESSION_PAGE_SIZE,
  enabled = true,
}: UseSessionsQueryOptions = {}) => {
  return useQuery({
    queryKey: ["sessions", page, pageSize],
    queryFn: () => getSessions(page, pageSize),
    placeholderData: (previousData) => previousData,
    enabled,
  });
};
