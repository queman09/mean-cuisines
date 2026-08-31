import { useEffect } from "react";
import { Link } from "wouter";
import LegalLayout from "@/components/LegalLayout";

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Use — Mean Cuisines";
  }, []);

  return (
    <LegalLayout title="Terms of Use">
      <p className="text-sm text-muted-foreground">Effective: August 31, 2026</p>

      <p>
        These terms govern your use of Mean Cuisines at https://meancuisines.com. The site is
        operated by the operator of meancuisines.com. By using the site, you agree to these terms.
        If you do not agree, do not use the site.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">The service</h2>
      <p>
        Mean Cuisines is a meal-planning tool that helps you match kitchen equipment to recipes and
        build a cook schedule. It is provided as-is for personal, non-commercial use unless the
        operator agrees otherwise in writing.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Not professional advice</h2>
      <p>
        Recipes, times, temperatures, and schedules are informational starting points. Food safety,
        allergens, nutrition, and cooking results are your responsibility. Always verify doneness
        and follow current food-safety guidance. The site is not a substitute for professional
        culinary, nutritional, or medical advice.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Your content</h2>
      <p>
        If you add recipes or other material, you represent that you have the right to do so and
        that the material is not unlawful. You grant the operator of meancuisines.com a
        non-exclusive license to store and display that material in order to operate the site. Do
        not upload anyone else's private information.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Acceptable use</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Do not attack, scrape in an abusive way, or attempt to disrupt the site.</li>
        <li>Do not use the planner for anything illegal.</li>
        <li>Do not impersonate the operator of meancuisines.com or misrepresent affiliation.</li>
      </ul>

      <h2 className="font-display font-bold text-xl pt-2">Amazon Associates disclosure</h2>
      <p>
        Mean Cuisines is a participant in the Amazon Services LLC Associates Program, an affiliate
        advertising program designed to provide a means for sites to earn advertising fees by
        advertising and linking to Amazon.com and affiliated sites. As an Amazon Associate, we earn
        from qualifying purchases. Product links (including ingredient "shop on Amazon" links) may
        include the tracking tag meancuisines-20. Amazon is a third party; their site is governed
        by Amazon's terms and privacy policy. Prices, availability, and product details can change
        on Amazon without notice.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Third-party services</h2>
      <p>
        Fonts, hosting, Amazon, and any ads are provided by others. We are not responsible for
        third-party sites or for purchases you make on Amazon.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">No warranty</h2>
      <p>
        THE SITE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, express or
        implied, including merchantability, fitness for a particular purpose, and non-infringement.
        Cooking schedules may be wrong. Equipment conflicts may be missed. We do not warrant that
        the site will be uninterrupted or error-free.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, the operator of meancuisines.com is not liable for
        indirect, incidental, special, consequential, or punitive damages, or for lost data, lost
        profits, or kitchen mishaps arising from your use of the site. Total liability for any
        claim relating to the site will not exceed one hundred U.S. dollars (US $100).
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Changes and termination</h2>
      <p>
        The operator may change or discontinue the site at any time. Terms may be updated by posting
        a new version here. Continued use after a change means you accept the new terms.
      </p>

      <h2 className="font-display font-bold text-xl pt-2">Contact</h2>
      <p>
        Questions about these terms go to the operator of meancuisines.com. Related:{" "}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </p>
    </LegalLayout>
  );
}
