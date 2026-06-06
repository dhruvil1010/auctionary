import { useEffect, useState } from "react";
import { getAuctions } from "../api/auctions.js";
import { Container, AuctionCard } from "../components";
import { CATEGORIES, SORT_OPTIONS } from "../constants.js";

export default function Home() {
  const [data, setData] = useState({
    docs: [],
    totalDocs: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filter state
  const [searchInput, setSearchInput] = useState(""); // raw text box value
  const [search, setSearch] = useState(""); // debounced value used for fetching
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Fetch whenever the page or a filter changes.
  useEffect(() => {
    let active = true;
    setLoading(true);

    const params = { page, limit: 12, sort };
    if (category) params.category = category;
    if (search.trim()) params.search = search.trim();

    getAuctions(params)
      .then((res) => {
        if (active) {
          setData(res.data.data);
          setError("");
        }
      })
      .catch((err) => {
        if (active)
          setError(err.response?.data?.message || "Failed to load auctions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, sort, category, search]);

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-ink">Live auctions</h1>
        <p className="text-ink/60">
          Browse {data.totalDocs} item{data.totalDocs === 1 ? "" : "s"} up for
          auction.
        </p>
      </div>

      {/* filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by title..."
          className="min-w-[200px] flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* grid */}
      {loading ? (
        <p className="py-16 text-center text-ink/50">Loading auctions…</p>
      ) : error ? (
        <p className="py-16 text-center text-accent">{error}</p>
      ) : data.docs.length === 0 ? (
        <div className="py-16 text-center text-ink/50">
          <p>No auctions found. Try clearing the filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.docs.map((a) => (
              <AuctionCard key={a._id} auction={a} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-ink/60">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </Container>
  );
}
