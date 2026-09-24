import { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Search,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { BLOG_POSTS, type BlogPost } from "@/lib/blogData";

export const metadata: Metadata = {
  title: "School Management Blog & Educational Technology Insights | SchoolVajo",
  description:
    "Explore expert guides, best practices, and technological insights on online school management, student attendance tracking, digital gradebooks, and school ERP automation.",
  keywords: [
    "school management blog",
    "school ERP insights",
    "online attendance guide",
    "digital report cards",
    "educational technology blog",
    "SchoolVajo articles",
  ],
  alternates: {
    canonical: "https://schoolvajo.com/blog",
  },
  openGraph: {
    title: "School Management Blog & EdTech Insights | SchoolVajo",
    description:
      "Expert guides on online school management, attendance tracking, digital report cards, and school administration.",
    url: "https://schoolvajo.com/blog",
    siteName: "SchoolVajo",
    type: "website",
    images: [
      {
        url: "/about-banner.jpg",
        width: 1200,
        height: 630,
        alt: "SchoolVajo Blog - School Management Insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "School Management Blog & EdTech Insights | SchoolVajo",
    description:
      "Expert guides on online school management, attendance tracking, digital report cards, and school administration.",
    images: ["/about-banner.jpg"],
  },
};

export default function BlogIndexPage() {
  const featuredPost = BLOG_POSTS[0];
  const regularPosts = BLOG_POSTS.slice(1);

  // Schema.org CollectionPage & Blog JSON-LD
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "SchoolVajo School Management Blog",
    description:
      "Expert educational leadership, school ERP workflows, digital grading, and campus technology guides.",
    url: "https://schoolvajo.com/blog",
    publisher: {
      "@type": "Organization",
      name: "SchoolVajo",
      logo: {
        "@type": "ImageObject",
        url: "https://schoolvajo.com/logo.png",
      },
    },
    blogPost: BLOG_POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      url: `https://schoolvajo.com/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Organization",
        name: "SchoolVajo",
      },
      image: `https://schoolvajo.com${post.coverImage}`,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <MarketingNavbar />

      {/* Header Section */}
      <section className="relative pt-32 sm:pt-40 pb-16 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-4 font-medium">
            <Link href="/" className="hover:text-indigo-600 transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-indigo-600 font-semibold">Blog &amp; Resources</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>School Management &amp; EdTech Insights</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-3xl mx-auto mb-4">
            Insights &amp; Guides for{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Modern Educators
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Practical strategies, in-depth tutorials, and technology insights to help school leaders, principals, and teachers run smarter institutions.
          </p>
        </div>
      </section>

      {/* Featured Article Card */}
      {featuredPost && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 hover:border-indigo-200 transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Featured Guide
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    {featuredPost.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {featuredPost.readTime}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight hover:text-indigo-600 transition">
                  <Link href={`/blog/${featuredPost.slug}`}>
                    {featuredPost.title}
                  </Link>
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {featuredPost.excerpt}
                </p>

                <div className="pt-2 flex items-center justify-between flex-wrap gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 p-1 border border-indigo-100 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">
                        SchoolVajo Editorial Team
                      </strong>
                      <span className="text-[11px] text-slate-500 block">
                        Verified Campus Insights
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
                  >
                    <span>Read Full Guide</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5">
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="block rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-16/10 bg-slate-100 group relative"
                >
                  <img
                    src={featuredPost.coverImage}
                    alt={featuredPost.coverAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Regular Articles Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/80">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Latest Articles &amp; Tutorials
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive breakdowns of school management systems and campus workflows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {regularPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block aspect-16/10 overflow-hidden bg-slate-100 relative group"
                >
                  <img
                    src={post.coverImage}
                    alt={post.coverAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-extrabold shadow-sm uppercase tracking-wider">
                    {post.category}
                  </div>
                </Link>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      {post.readTime}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight hover:text-indigo-600 transition leading-snug">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>SchoolVajo Editorial</span>
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:gap-2 transition-all"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-8 sm:p-12 text-center space-y-5 shadow-xl shadow-indigo-600/20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Start Managing Today
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Experience Modern Cloud Campus Management?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-xl mx-auto leading-relaxed">
            Join schools across India streamlining attendance, homework, exams, and parent communication with SchoolVajo.
          </p>
          <div className="pt-2 flex justify-center">
            <Link
              href="/register-school"
              className="px-7 py-3.5 rounded-2xl bg-white text-indigo-700 font-extrabold text-sm shadow-lg hover:bg-indigo-50 hover:scale-105 transition-all"
            >
              Start Free Registration
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
