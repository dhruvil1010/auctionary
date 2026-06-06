import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAuction } from "../api/auctions.js";
import { Container, Input, Button } from "../components";
import { CATEGORIES, MAX_DURATION_DAYS } from "../constants.js";

// Format a Date as the local "YYYY-MM-DDTHH:mm" string a datetime-local input wants.
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Create Auction page (route: /sell, wrapped in ProtectedRoute).
// Sellers fill in the item details + pick an image; on submit we send everything
// as multipart/form-data so the file rides along with the text fields.
export default function Sell() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    startingPrice: "",
    buyoutPrice: "", // optional "buy it now" price (must be > startingPrice)
    endAt: "", // datetime-local value (the seller's local time) for when it ends
  });

  // Picker bounds, computed once: can't end in the past, can't be > 10 days out.
  const [bounds] = useState(() => {
    const now = new Date();
    const max = new Date(now.getTime() + MAX_DURATION_DAYS * 24 * 60 * 60 * 1000);
    return { min: toLocalInput(now), max: toLocalInput(max) };
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(""); // local object URL for the chosen image
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file)); // show a preview without uploading yet
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!imageFile) {
      setError("Please choose an image for your auction.");
      return;
    }
    if (!form.category) {
      setError("Please pick a category.");
      return;
    }

    // Validate the chosen end date/time: present, valid, in the future, within cap.
    if (!form.endAt) {
      setError("Please choose when the auction ends.");
      return;
    }
    const end = new Date(form.endAt);
    const nowMs = Date.now();
    if (Number.isNaN(end.getTime())) {
      setError("Please choose a valid end date and time.");
      return;
    }
    if (end.getTime() <= nowMs) {
      setError("The end time must be in the future.");
      return;
    }
    if (end.getTime() - nowMs > MAX_DURATION_DAYS * 24 * 60 * 60 * 1000) {
      setError(`Auctions can run at most ${MAX_DURATION_DAYS} days.`);
      return;
    }

    // Optional buy-now price: if filled in, it must be greater than the starting price.
    const startNum = Number(form.startingPrice);
    const buyStr = form.buyoutPrice.trim();
    const buyNum = buyStr === "" ? null : Number(buyStr);
    if (buyNum !== null) {
      if (!Number.isFinite(buyNum) || buyNum <= 0) {
        setError("Buy-now price must be a positive number.");
        return;
      }
      if (buyNum <= startNum) {
        setError("Buy-now price must be greater than the starting price.");
        return;
      }
    }

    setLoading(true);
    try {
      // FormData lets us mix the image file with the text fields in one request.
      const data = new FormData();
      data.append("image", imageFile);
      data.append("title", form.title);
      data.append("description", form.description);
      data.append("category", form.category);
      data.append("startingPrice", form.startingPrice);
      if (buyNum !== null) data.append("buyoutPrice", String(buyNum));
      // Send the exact end instant in ISO (UTC) — the backend stores it directly.
      data.append("endTime", end.toISOString());

      const res = await createAuction(data);
      const created = res.data.data;
      // Go straight to the new auction's page (real-time detail comes next).
      navigate(`/auctions/${created._id}`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create the auction. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="font-heading text-3xl font-bold text-ink">
          List an item
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Add the details below. Your auction goes live immediately.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Input
            label="Title"
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="e.g. Vintage Omega Seamaster, 1968"
            required
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Description
            </span>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              placeholder="Condition, history, what makes it special…"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-brand"
            />
          </label>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Category
              </span>
              <select
                name="category"
                value={form.category}
                onChange={onChange}
                required
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-brand"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Ends at{" "}
                <span className="font-normal text-ink/50">
                  (max {MAX_DURATION_DAYS} days out)
                </span>
              </span>
              <input
                type="datetime-local"
                name="endAt"
                value={form.endAt}
                onChange={onChange}
                min={bounds.min}
                max={bounds.max}
                required
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-brand"
              />
            </label>
          </div>

          <Input
            label="Starting price (₹)"
            type="number"
            name="startingPrice"
            value={form.startingPrice}
            onChange={onChange}
            min="0"
            step="1"
            placeholder="0"
            required
          />

          <div>
            <Input
              label="Buy-now price (₹) — optional"
              type="number"
              name="buyoutPrice"
              value={form.buyoutPrice}
              onChange={onChange}
              min="0"
              step="1"
              placeholder="Let buyers purchase instantly"
            />
            <p className="mt-1 text-xs text-ink/50">
              Leave blank for none. If set, it must be higher than the starting price.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-ink">
              Image
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              required
              className="block w-full text-sm text-ink/70 file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white hover:file:opacity-90"
            />
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-3 aspect-[4/3] w-full max-w-xs rounded-lg object-cover"
              />
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create auction"}
          </Button>
        </form>
      </div>
    </Container>
  );
}
