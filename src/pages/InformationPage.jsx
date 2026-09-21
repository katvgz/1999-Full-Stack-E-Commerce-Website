import { ArrowUpRight } from "lucide-react";
import "./InformationPage.css";

export const informationRoutes = {
  "/shipping": "SHIPPING",
  "/returns": "RETURNS",
  "/size-guide": "SIZE GUIDE",
  "/contact": "CONTACT",
};

export default function InformationPage({ title }) {
  return <section className="catalog section-pad information-page" aria-labelledby="information-title">
    <div className="catalog-intro">
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb"><a href="/">HOME</a><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
      <p className="eyebrow">1999 / THE DETAILS</p>
      <div className="catalog-heading"><h1 id="information-title">{title}.</h1><ArrowUpRight aria-hidden="true" strokeWidth={1} /></div>
    </div>
    <div className="information-content">
      {title === "SHIPPING" && <><dl className="information-details"><div><dt>METRO MANILA</dt><dd>2–4 business days</dd></div><div><dt>PROVINCIAL</dt><dd>4–7 business days</dd></div><div><dt>SHIPPING FEE</dt><dd>₱120</dd></div></dl><p>Tracking details are emailed once shipped.</p><p>Orders are processed Monday–Saturday.</p></>}
      {title === "RETURNS" && <><ul><li>Returns accepted within 7 days of delivery.</li><li>Item must be unworn, unwashed, and with original tags.</li><li>Wrong or damaged items are eligible for replacement.</li><li>Change-of-mind returns are not accepted.</li><li>Contact the store before returning an item.</li></ul><a className="text-link" href="/contact">CONTACT DETAILS <ArrowUpRight size={17} /></a></>}
      {title === "SIZE GUIDE" && <><table className="information-size-table"><caption>Garment measurements / inches</caption><thead><tr><th scope="col">SIZE</th><th scope="col">CHEST</th><th scope="col">LENGTH</th></tr></thead><tbody>{[["S", 20, 27], ["M", 21, 28], ["L", 22, 29], ["XL", 23, 30]].map(([size, chest, length]) => <tr key={size}><th scope="row">{size}</th><td>{chest}&quot;</td><td>{length}&quot;</td></tr>)}</tbody></table><p>Measurements are approximate and may vary slightly by piece.</p></>}
      {title === "CONTACT" && <><dl className="information-details"><div><dt>EMAIL</dt><dd>hello@1999clothing.example</dd></div><div id="instagram"><dt>INSTAGRAM</dt><dd>@1999clothing</dd></div><div id="tiktok"><dt>TIKTOK</dt><dd>@1999clothing</dd></div><div id="facebook"><dt>FACEBOOK</dt><dd>Demo placeholder — no live page</dd></div><div><dt>LOCATION</dt><dd>Metro Manila, Philippines</dd></div><div><dt>HOURS</dt><dd>Monday–Saturday, 10 AM–6 PM</dd></div></dl></>}
    </div>
  </section>;
}
