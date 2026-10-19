"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { SearchIcon } from "@/components/Icons";
import { PortalShell } from "@/components/PortalShell";
import { Pagination } from "@/components/ui/Pagination";
import { fetchUsers, setUserActive } from "@/features/admin/api";
import type { AdminUserRow } from "@/features/admin/types";
import { PageHeader, FilterTabs } from "@/components/ui/Page";
import { ApiError } from "@/lib/api";
import { formatDate, initialsOf, timeAgo } from "@/lib/format";

type RoleFilter = "" | "farmer" | "agency" | "lender" | "admin";

const ROLE_LABELS: Record<Exclude<RoleFilter, "">, string> = {
  farmer: "Farmers",
  agency: "Agencies",
  lender: "Lenders",
  admin: "Admins",
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<RoleFilter>("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", role, status, q, page],
    queryFn: () => fetchUsers({ role, status, q, page }),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setUserActive(id, active),
    onSuccess: () => {
      setError("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "The change could not be saved."),
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setQ(search.trim());
    setPage(1);
  }

  function onToggle(u: AdminUserRow) {
    const suspend = u.is_active;
    const message = suspend
      ? `Suspend ${u.name || u.username}? They are signed out and cannot log in until you restore them.`
      : `Restore ${u.name || u.username}? They can log in again straight away.`;
    if (window.confirm(message)) toggle.mutate({ id: u.id, active: !u.is_active });
  }

  const totals = users.data?.role_totals;
  const allCount = totals ? Object.values(totals).reduce((a, b) => a + b, 0) : undefined;

  return (
    <PortalShell role="admin" title="Users">
      <PageHeader
        title="Users"
        lead={users.data ? `${users.data.count.toLocaleString("en-KE")} accounts match` : "Everyone with an account"}
      />

      <div className="toolbar">
        <FilterTabs
          label="Role"
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "All", count: allCount },
            ...(Object.keys(ROLE_LABELS) as Exclude<RoleFilter, "">[]).map((r) => ({
              value: r as RoleFilter,
              label: ROLE_LABELS[r],
              count: totals?.[r],
            })),
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <form onSubmit={onSearch} className="search-box" role="search">
            <SearchIcon size={16} />
            <label className="sr-only" htmlFor="user-search">
              Search users
            </label>
            <input
              id="user-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, username or email"
            />
          </form>
          <label className="sr-only" htmlFor="user-status">
            Status
          </label>
          <select
            id="user-status"
            className="field !w-auto"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Suspended</option>
          </select>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="table-wrap">
        <table className="data-table min-w-[52rem]">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Details</th>
              <th>Joined</th>
              <th>Last login</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.isLoading ? (
              <tr>
                <td colSpan={7} className="!py-10 text-center">
                  Loading users…
                </td>
              </tr>
            ) : (users.data?.results.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={7} className="!py-10 text-center">
                  No users match these filters.
                </td>
              </tr>
            ) : (
              users.data?.results.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="avatar avatar--light">{initialsOf(u.name || u.username)}</span>
                      <span className="min-w-0">
                        <span className="block max-w-[16rem] truncate font-semibold text-[var(--ink)]">
                          {u.name || u.username}
                        </span>
                        <span className="block max-w-[16rem] truncate text-xs">{u.email || u.username}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td className="max-w-[12rem] truncate">{u.detail || "—"}</td>
                  <td className="whitespace-nowrap">{formatDate(u.date_joined)}</td>
                  <td className="whitespace-nowrap">{u.last_login ? timeAgo(u.last_login) : "Never"}</td>
                  <td>
                    <span className={`badge ${u.is_active ? "badge-ok" : "badge-danger"}`}>
                      {u.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="text-right">
                    {u.is_staff ? (
                      <span className="text-xs">Staff</span>
                    ) : (
                      <button
                        type="button"
                        className={`btn !py-1.5 text-xs ${u.is_active ? "btn-ghost" : "btn-primary"}`}
                        disabled={toggle.isPending}
                        onClick={() => onToggle(u)}
                      >
                        {u.is_active ? "Suspend" : "Restore"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {users.data && users.data.pages > 1 ? (
        <Pagination page={users.data.page} pages={users.data.pages} onChange={setPage} />
      ) : null}
    </PortalShell>
  );
}
