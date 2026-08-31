import { useEffect } from "react";
import { Link } from "wouter";
import LegalLayout from "@/components/LegalLayout";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy — Mean Cuisines";
  }, []);

  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-sm text-muted-foreground">Effective: August 31, 2026</p>

      <p>
        This policy describes how Mean Cuisines ("we", "the site") handles information when you use
        https://meancuisines.com. The site is operated by the operator of meancuisines.com. We do not
        publish a personal email address here; contact the operator of meancuisines.com through the
        site if you have a privacy request.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Information we process</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Planner input you provide.</strong> Recipes, equipment choices, cook schedules, and
          similar content you enter into the app may be stored so the planner can function.
        </li>
        <li>
          <strong>Technical data.</strong> Like most websites, our host (currently Railway) and the
          browser automatically process IP address, user-agent, timestamps, and request URLs in
          server logs for security, uptime, and debugging.
        </li>
        <li>
          <strong>No account required to browse.</strong> If sign-in or similar features are added
          later, credentials and profile data associated with an account would also be processed
          to provide that feature.
        </li>
      </ul>

      <h2 className="font-display font-bold text-xl pt-2">Cookies and similar technology</h2>
      <p>
        The planner itself does not exist to profile you for advertising. Third parties we load or
        link to may set their own cookies when you interact with them, including:
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Font delivery (Fontshare) when pages load brand fonts.</li>
        <li>
          Amazon.com when you follow an affiliate product or ingredient link (tag{" "}
          <code className="text-sm">meancuisines-20</code>). Amazon's own privacy policy applies
          once you are on Amazon.
        </li>
        <li>
          Advertising partners if/when Google AdSense or similar units are enabled. Those partners
          may use cookies or device identifiers to serve and measure ads.
        </li>
      </ul>

      <h2 className="font-display font-bold text-xl pt-2">Amazon Associates</h2>
      <p>
        Mean Cuisines is a participant in the Amazon Services LLC Associates Program, an affiliate
        advertising program designed to provide a means for sites to earn advertising fees by
        advertising and linking to Amazon.com and affiliated sites. As an Amazon Associate, we earn
        from qualifying purchases. Affiliate links use the tracking tag meancuisines-20. Clicking
        those links may allow Amazon to know you came from this site. We do not receive your Amazon
        account password or full order details from Amazon beyond standard affiliate reporting.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">How we use information</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>To run the meal planner and remember content you save on the site.</li>
        <li>To keep the service secure and diagnose outages.</li>
        <li>To measure affiliate referrals in aggregate (Amazon Associates reports).</li>
        <li>To comply with law if we are legally required to do so.</li>
      </ul>

      <h2 className="font-display font-bold text-xl pt-2">Sharing</h2>
      <p>
        We do not sell your personal information. Hosting, font, and (if enabled) advertising or
        analytics providers process data as processors or independent controllers under their own
        terms. Amazon processes data when you visit Amazon via our links.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Retention</h2>
      <p>
        Planner content remains until you delete it or the operator removes it. Server logs are kept
        only as long as needed for operations and security. Affiliate reports follow Amazon's
        retention practices.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Your choices</h2>
      <p>
        You can stop using the site at any time, use browser controls to block cookies, and decline
        to click affiliate links. To request deletion of content you saved on Mean Cuisines, contact
        the operator of meancuisines.com.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Children</h2>
      <p>
        Mean Cuisines is not directed at children under 13, and we do not knowingly collect personal
        information from children under 13.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Changes</h2>
      <p>
        We may update this policy as the site changes. The effective date above will be revised when
        we do. Continued use after an update means you accept the revised policy.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Contact</h2>
      <p>
        Privacy questions go to the operator of meancuisines.com. Please do not send passwords or
        payment card numbers. Related: <Link href="/terms" className="text-primary hover:underline">Terms of Use</Link>.
      </p>
    </LegalLayout>
  );
}
