"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { recordsRepository } from "./repository";
import type { FarmActivity, FarmField, FarmSale } from "./types";

export function useFarmRecords() {
  const { user } = useAuth();
  const userId = user?.user.id ?? 0;
  const qc = useQueryClient();
  const queryKey = ["farm-records", userId];

  const records = useQuery({
    queryKey,
    queryFn: () => recordsRepository.load(userId),
    enabled: Boolean(user),
  });

  const refresh = () => qc.invalidateQueries({ queryKey });

  return {
    records,
    saveField: useMutation({ mutationFn: (f: FarmField) => recordsRepository.saveField(userId, f), onSuccess: refresh }),
    deleteField: useMutation({ mutationFn: (id: string) => recordsRepository.deleteField(userId, id), onSuccess: refresh }),
    saveActivity: useMutation({
      mutationFn: (a: FarmActivity) => recordsRepository.saveActivity(userId, a),
      onSuccess: refresh,
    }),
    deleteActivity: useMutation({
      mutationFn: (id: string) => recordsRepository.deleteActivity(userId, id),
      onSuccess: refresh,
    }),
    saveSale: useMutation({ mutationFn: (s: FarmSale) => recordsRepository.saveSale(userId, s), onSuccess: refresh }),
    deleteSale: useMutation({ mutationFn: (id: string) => recordsRepository.deleteSale(userId, id), onSuccess: refresh }),
  };
}
