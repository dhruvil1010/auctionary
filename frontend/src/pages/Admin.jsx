import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getStats,
  getUsers,
  deleteUser,
  getAuctions,
  deleteAuction,
} from "../api/admin.js";
import { Container } from "../components";

const rupee = (n) => `₹${Number(n ?? 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const statusTone = {
  live: "bg-brand/10 text-brand",
  upcoming: "bg-page text-ink/60",
  ended: "bg-ink/10 text-ink/60",
};

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("users"); // "users" | "auctions"

  // each tab keeps its own page + payload
  const [users, setUsers] = useState({ users: [], page: 1, totalPages: 1 });
  const [usersPage, setUsersPage] = useState(1);
  const [auctions, setAuctions] = useState({ docs: [], page: 1, totalPages: 1 });
  const [auctionsPage, setAuctionsPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // dashboard numbers (once)
  const loadStats = () =>
    getStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {});

  useEffect(() => {
    loadStats();
  }, []);

  // fetch whichever tab is active when it / its page changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    setActionError("");
    const req =
      tab === "users"
        ? getUsers({ page: usersPage, limit: 20 })
        : getAuctions({ page: auctionsPage, limit: 20 });

    req
      .then((res) => {
        if (!active) return;
        if (tab === "users") setUsers(res.data.data);
        else setAuctions(res.data.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, usersPage, auctionsPage]);

  const onDeleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.username}" and all their data?`)) return;
    setActionError("");
    setDeletingId(u._id);
    try {
      await deleteUser(u._id);
      // if we just removed the last row on a page past 1, step back
      if (users.users.length === 1 && usersPage > 1) setUsersPage((p) => p - 1);
      else await getUsers({ page: usersPage, limit: 20 }).then((r) => setUsers(r.data.data));
      loadStats();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const onDeleteAuction = async (a) => {
    if (!window.confirm(`Delete auction "${a.title}" and its bids?`)) return;
    setActionError("");
    setDeletingId(a._id);
    try {
      await deleteAuction(a._id);
      if (auctions.docs.length === 1 && auctionsPage > 1)
        setAuctionsPage((p) => p - 1);
      else
        await getAuctions({ page: auctionsPage, limit: 20 }).then((r) =>
          setAuctions(r.data.data)
        );
      loadStats();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not delete auction.");
    } finally {
      setDeletingId(null);
    }
  };

  const statTiles = stats
    ? [
        { label: "Users", value: stats.totalUsers },
        { label: "Auctions", value: stats.totalAuctions },
        { label: "Live", value: stats.liveAuctions },
        { label: "Ended", value: stats.endedAuctions },
        { label: "Bids", value: stats.totalBids },
      ]
    : [];

  return (
    <Container className="py-8">
      <h1 className="font-heading text-3xl font-bold text-ink">Admin</h1>
      <p className="mt-1 text-sm text-ink/60">
        Platform overview and moderation.
      </p>

      {/* dashboard stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statTiles.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-xs text-ink/50">{s.label}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="mt-8 flex gap-2">
        {["users", "auctions"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
              tab === t
                ? "bg-brand text-white"
                : "border border-border bg-surface text-ink hover:bg-page"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
          {actionError}
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-ink/50">Loading…</p>
      ) : tab === "users" ? (
        <UsersTable
          data={users}
          page={usersPage}
          setPage={setUsersPage}
          onDelete={onDeleteUser}
          deletingId={deletingId}
        />
      ) : (
        <AuctionsTable
          data={auctions}
          page={auctionsPage}
          setPage={setAuctionsPage}
          onDelete={onDeleteAuction}
          deletingId={deletingId}
        />
      )}
    </Container>
  );
}

// ---- Users table ----
function UsersTable({ data, page, setPage, onDelete, deletingId }) {
  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.users.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-3 font-medium text-ink">{u.username}</td>
                <td className="px-4 py-3 text-ink/70">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      u.role === "admin"
                        ? "bg-accent/10 text-accent"
                        : "bg-page text-ink/60"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/60">{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {u.role === "admin" ? (
                    <span className="text-xs text-ink/30">protected</span>
                  ) : (
                    <button
                      onClick={() => onDelete(u)}
                      disabled={deletingId === u._id}
                      className="text-sm font-semibold text-accent hover:underline disabled:opacity-50"
                    >
                      {deletingId === u._id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} totalPages={data.totalPages} setPage={setPage} />
    </>
  );
}

// ---- Auctions table ----
function AuctionsTable({ data, page, setPage, onDelete, deletingId }) {
  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Bids</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.docs.map((a) => (
              <tr key={a._id}>
                <td className="px-4 py-3">
                  <Link
                    to={`/auctions/${a._id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <img
                      src={a.image}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded bg-page object-cover"
                    />
                    <span className="font-medium text-ink line-clamp-1">
                      {a.title}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {a.seller?.username || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      statusTone[a.status] || "bg-page text-ink/60"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-ink">
                  {rupee(a.currentPrice)}
                </td>
                <td className="px-4 py-3 text-ink/60">{a.bidCount}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(a)}
                    disabled={deletingId === a._id}
                    className="text-sm font-semibold text-accent hover:underline disabled:opacity-50"
                  >
                    {deletingId === a._id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} totalPages={data.totalPages} setPage={setPage} />
    </>
  );
}

// ---- shared pager ----
function Pager({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        disabled={page <= 1}
        onClick={() => setPage((p) => p - 1)}
        className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-ink/60">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => setPage((p) => p + 1)}
        className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
