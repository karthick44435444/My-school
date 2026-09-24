import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Calendar,
  Share2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Bookmark,
  BookOpen,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import {
  BLOG_POSTS,
  getBlogPostBySlug,
  getAllBlogSlugs,
  type BlogPost,
} from "@/lib/blogData";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Blog Post Not Found | SchoolVajo",
      description: "The requested school management article could not be found.",
    };
  }

  const canonicalUrl = `https://schoolvajo.com/blog/${post.slug}`;

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: canonicalUrl,
      siteName: "SchoolVajo",
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.coverAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  // Schema.org BlogPosting / Article JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    image: `https://schoolvajo.com${post.coverImage}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: "SchoolVajo",
      logo: {
        "@type": "ImageObject",
        url: "https://schoolvajo.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://schoolvajo.com/blog/${post.slug}`,
    },
    keywords: post.keywords.join(", "),
  };

  const publishDateFormatted = new Date(post.publishedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Article Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <MarketingNavbar />

      <main className="pt-28 sm:pt-36 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium flex-wrap"
          >
            <Link href="/" className="hover:text-indigo-600 transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/blog" className="hover:text-indigo-600 transition">
              Blog
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold truncate max-w-[240px]">
              {post.title}
            </span>
          </nav>

          {/* Article Header */}
          <header className="space-y-4 mb-8">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                {post.category}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {post.readTime}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {publishDateFormatted}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              {post.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              {post.excerpt}
            </p>

            {/* Author Profile Ribbon */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 p-2 border border-indigo-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <strong className="text-xs font-bold text-slate-900 block">
                    {post.author.name}
                  </strong>
                  <span className="text-[11px] text-slate-500 block">
                    {post.author.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/register-school"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <span>Try SchoolVajo Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </header>

          {/* Cover Hero Image */}
          <div className="rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg mb-10 aspect-16/9 bg-slate-100 relative">
            <img
              src={post.coverImage}
              alt={post.coverAlt}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Table of Contents Box */}
          {post.tableOfContents && post.tableOfContents.length > 0 && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 mb-10 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Table of Contents
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {post.tableOfContents.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="hover:text-indigo-600 transition flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span>{item.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Article Content */}
          <article className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed">
            {/* Intro paragraph */}
            <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-normal bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              {post.content.intro}
            </p>

            {/* Sections */}
            {post.content.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-4 pt-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-2 border-b border-slate-100 pb-2">
                  {section.heading}
                </h2>

                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="text-slate-600 leading-relaxed">
                    {p}
                  </p>
                ))}

                {/* Key Takeaways Box */}
                {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                  <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/80 p-4 space-y-2 my-4">
                    <strong className="text-xs font-bold uppercase tracking-wider text-emerald-900 block flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Takeaways
                    </strong>
                    <ul className="space-y-1 text-xs text-emerald-950">
                      {section.keyTakeaways.map((takeaway, tIdx) => (
                        <li key={tIdx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quote Callout */}
                {section.quote && (
                  <blockquote className="border-l-4 border-indigo-600 pl-4 py-2 italic text-slate-800 bg-indigo-50/40 rounded-r-xl my-4 text-sm font-medium">
                    &ldquo;{section.quote}&rdquo;
                  </blockquote>
                )}
              </section>
            ))}

            {/* FAQs if present */}
            {post.content.faqs && post.content.faqs.length > 0 && (
              <section id="faqs" className="space-y-4 pt-6">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {post.content.faqs.map((faq, fIdx) => (
                    <div
                      key={fIdx}
                      className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1.5 shadow-2xs"
                    >
                      <h4 className="font-bold text-sm text-slate-900">
                        {faq.q}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Conclusion */}
            <div id="conclusion" className="pt-6 border-t border-slate-200">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3">
                Conclusion
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {post.content.conclusion}
              </p>
            </div>
          </article>

          {/* Registration CTA Ribbon */}
          <div className="mt-12 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-600/20">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Start Free in 2 Minutes
              </div>
              <h3 className="text-lg sm:text-xl font-bold">
                Experience SchoolVajo for Your Campus
              </h3>
              <p className="text-xs text-indigo-100 max-w-md">
                Register your school today with full access to attendance, homework, report cards, and the mobile app.
              </p>
            </div>

            <Link
              href="/register-school"
              className="px-6 py-3 rounded-2xl bg-white text-indigo-700 font-extrabold text-xs shadow-md hover:bg-indigo-50 hover:scale-105 transition-all shrink-0"
            >
              Register School Free
            </Link>
          </div>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 pt-10 border-t border-slate-200">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-6">
                Related Educational Guides
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/blog/${rel.slug}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {rel.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition mt-2 leading-snug">
                        {rel.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 pt-2 border-t border-slate-100">
                      <span>Read Guide</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
