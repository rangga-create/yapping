import Link from "next/link";
import { ArrowRight, Check, MessageCircle, Sparkles, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="Yap beranda">
          <span className="landing-brand-icon"><MessageCircle size={21} /></span>
          <span>yap<span className="landing-brand-period">.</span></span>
        </Link>
        <div className="landing-nav-actions">
          <Link className="landing-login" href="/login">Masuk</Link>
          <Link className="landing-nav-cta" href="/register">Buat akun <ArrowRight size={15} /></Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="landing-eyebrow"><Sparkles size={14} /> RUANG NGOBROL PUNYAMU</div>
          <h1>Obrolan seru,<br /><span>tanpa ribet.</span></h1>
          <p className="landing-description">
            Bikin grup, kumpulkan teman, dan lanjutkan obrolan secara realtime. Semua percakapanmu di satu tempat.
          </p>
          <div className="landing-actions">
            <Link className="landing-main-cta" href="/register">Mulai ngobrol <ArrowRight size={17} /></Link>
            <Link className="landing-secondary-cta" href="/login">Sudah punya akun?</Link>
          </div>
          <div className="landing-benefits">
            <span><Check size={15} /> Gratis untuk mulai</span>
            <span><Check size={15} /> Pesan realtime</span>
          </div>
        </div>

        <div className="landing-preview" aria-label="Pratinjau obrolan Yap">
          <div className="preview-glow" />
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-dots"><i /><i /><i /></div>
              <span>Yap <span className="preview-online-dot" /> online</span>
              <span className="preview-topbar-spacer" />
            </div>
            <div className="preview-chat">
              <aside className="preview-sidebar">
                <div className="preview-sidebar-title">Ruang kamu</div>
                <div className="preview-room preview-room-active"><span>✦</span> Teman dekat</div>
                <div className="preview-room"><span>◉</span> Tim kreatif</div>
                <div className="preview-room"><span>＋</span> Grup baru</div>
                <div className="preview-sidebar-bottom"><Users size={14} /> Teman-teman</div>
              </aside>
              <div className="preview-messages">
                <div className="preview-room-heading">
                  <div className="preview-room-avatar">✦</div>
                  <div><strong>Teman dekat</strong><small>5 anggota · ruang ngobrol santai</small></div>
                </div>
                <div className="preview-message">
                  <div className="preview-avatar preview-avatar-purple">A</div>
                  <div><small> Alya <time>10:41</time></small><p>Weekend ini jadi jalan-jalan, kan? 🌿</p></div>
                </div>
                <div className="preview-message preview-message-self">
                  <div className="preview-avatar preview-avatar-teal">K</div>
                  <div><small>Kamu <time>10:42</time></small><p>Jadi dong! Udah nggak sabar ✨</p></div>
                </div>
                <div className="preview-message">
                  <div className="preview-avatar preview-avatar-orange">D</div>
                  <div><small>Dimas <time>10:42</time></small><p>Gas, aku cari tempatnya ya!</p></div>
                </div>
                <div className="preview-composer"><span>Tulis pesan...</span><span className="preview-send"><ArrowRight size={15} /></span></div>
              </div>
            </div>
          </div>
          <div className="preview-note"><span className="preview-note-icon"><MessageCircle size={16} /></span><span><strong>Selalu nyambung</strong><small>Pesan terkirim secara realtime</small></span></div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Obrolan lebih dekat, di mana pun kamu berada.</span>
        <span>© 2026 Yap</span>
      </footer>
    </main>
  );
}
