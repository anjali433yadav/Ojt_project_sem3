
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

type Campaign = {
  id: string;
  name: string;
};

export default function GenerateSimulationPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [topic, setTopic] = useState("Suspicious Email Awareness");
  const [audience, setAudience] = useState("Company employees");
  const [difficulty, setDifficulty] = useState("beginner");

  const [title, setTitle] = useState("Suspicious Email Awareness");
  const [subject, setSubject] = useState("Important Account Security Update");
  const [category, setCategory] = useState("Email Security");
  const [content, setContent] = useState("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        router.replace("/");
        return;
      }

      try {
        const data = await apiRequest("/api/campaigns", {}, token);
        const list: Campaign[] = Array.isArray(data)
          ? data
          : data.campaigns ?? data.items ?? data.results ?? [];

        setCampaigns(list);

        if (list.length > 0) {
          setCampaignId(list[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load campaigns."
        );
      }
    }

    loadCampaigns();
  }, [router]);

  async function generateContent() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    if (!topic.trim() || !audience.trim()) {
      setError("Please enter a topic and audience.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const result = await apiRequest(
        "/api/ai/generate-simulation",
        {
          method: "POST",
          body: JSON.stringify({ topic, audience, difficulty }),
        },
        token
      );

      setContent(result.content);
      setMessage("Content generated successfully. Review it before saving.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Content generation failed."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    if (!campaignId) {
      setError("Please select a campaign.");
      return;
    }

    if (!title.trim() || !subject.trim() || !content.trim()) {
      setError("Title, subject and generated content are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await apiRequest(
        `/api/campaigns/${campaignId}/simulations/save-ai-draft`,
        {
          method: "POST",
          body: JSON.stringify({
            title,
            subject,
            content,
            category,
            difficulty,
          }),
        },
        token
      );

      setMessage("AI simulation saved and submitted for human review.");
      setContent("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the draft."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/simulations"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Simulations
        </Link>

        <h1 className="mt-5 text-3xl font-bold">
          AI Simulation Generator
        </h1>
        <p className="mt-2 text-slate-400">
          Generate safe phishing-awareness training content using Google Gemini.
        </p>

        <section className="mt-8 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Generation Settings</h2>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Select Campaign
            </span>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
            >
              {campaigns.length === 0 && (
                <option value="">No campaigns available</option>
              )}
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Training Topic
            </span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              placeholder="Example: Suspicious Email Awareness"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Target Audience
            </span>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              placeholder="Example: Company employees"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">
              Difficulty
            </span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <button
            onClick={generateContent}
            disabled={generating || campaigns.length === 0}
            className="w-full rounded-lg bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate with Gemini"}
          </button>
        </section>

        {content && (
          <section className="mt-6 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Review Generated Content</h2>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Simulation Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Email Subject
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Category
              </span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">
                Generated Content
              </span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              />
            </label>

            <button
              onClick={saveDraft}
              disabled={saving}
              className="w-full rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save and Submit for Review"}
            </button>
          </section>
        )}

        {message && (
          <p className="mt-5 rounded-lg border border-green-800 bg-green-950 p-4 text-green-300">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
