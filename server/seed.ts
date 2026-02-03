import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail("admin@mailflow.io");
    if (existingAdmin) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database...");

    // Create admin tenant
    const adminTenant = await storage.createTenant({
      name: "MailFlow Admin",
      sendingFromName: "MailFlow",
      replyToEmail: "support@mailflow.io",
      companyAddress: "123 Email Street, Suite 100\nSan Francisco, CA 94102",
      status: "active",
    });

    // Create admin subscription
    await storage.createSubscription({
      tenantId: adminTenant.id,
      plan: "agency",
      status: "active",
    });

    // Create admin user
    const adminPasswordHash = await hashPassword("admin123");
    await storage.createUser({
      email: "admin@mailflow.io",
      passwordHash: adminPasswordHash,
      firstName: "Admin",
      lastName: "User",
      tenantId: adminTenant.id,
      role: "admin",
    });

    // Create demo tenant
    const demoTenant = await storage.createTenant({
      name: "Demo Company",
      sendingFromName: "Demo Company Newsletter",
      replyToEmail: "newsletter@demo.com",
      companyAddress: "456 Demo Ave\nNew York, NY 10001",
      status: "active",
    });

    // Create demo subscription
    await storage.createSubscription({
      tenantId: demoTenant.id,
      plan: "pro",
      status: "active",
    });

    // Create demo user
    const demoPasswordHash = await hashPassword("demo123");
    await storage.createUser({
      email: "demo@example.com",
      passwordHash: demoPasswordHash,
      firstName: "Sarah",
      lastName: "Johnson",
      tenantId: demoTenant.id,
      role: "user",
    });

    // Create sample contacts for demo tenant
    const sampleContacts = [
      { email: "john.smith@acme.com", firstName: "John", lastName: "Smith", tags: ["customer", "newsletter"] },
      { email: "emily.chen@techstart.io", firstName: "Emily", lastName: "Chen", tags: ["prospect", "newsletter"] },
      { email: "michael.brown@globex.com", firstName: "Michael", lastName: "Brown", tags: ["customer"] },
      { email: "lisa.wong@innovate.co", firstName: "Lisa", lastName: "Wong", tags: ["customer", "vip"] },
      { email: "david.miller@startup.com", firstName: "David", lastName: "Miller", tags: ["prospect"] },
      { email: "jennifer.davis@enterprise.org", firstName: "Jennifer", lastName: "Davis", tags: ["newsletter"] },
      { email: "robert.wilson@tech.io", firstName: "Robert", lastName: "Wilson", tags: ["customer", "newsletter"] },
      { email: "amanda.taylor@design.co", firstName: "Amanda", lastName: "Taylor", tags: ["prospect", "vip"] },
    ];

    for (const contact of sampleContacts) {
      await storage.createContact({
        tenantId: demoTenant.id,
        ...contact,
        unsubscribed: false,
      });
    }

    // Create sample campaigns for demo tenant
    const campaigns = [
      {
        name: "Welcome Series - Email 1",
        subject: "Welcome to Demo Company!",
        status: "sent" as const,
        htmlContent: getWelcomeEmailTemplate(),
        totalRecipients: 45,
        delivered: 43,
        bounced: 2,
        complained: 0,
      },
      {
        name: "June Newsletter",
        subject: "Your June Updates Are Here",
        status: "sent" as const,
        htmlContent: getNewsletterTemplate(),
        totalRecipients: 120,
        delivered: 115,
        bounced: 4,
        complained: 1,
      },
      {
        name: "Product Launch Announcement",
        subject: "Introducing Our New Product Line",
        status: "draft" as const,
        htmlContent: getProductLaunchTemplate(),
      },
      {
        name: "Summer Sale",
        subject: "Up to 50% Off - Summer Sale Starts Now!",
        status: "draft" as const,
        htmlContent: getSaleCampaignTemplate(),
      },
    ];

    for (const campaign of campaigns) {
      await storage.createCampaign({
        tenantId: demoTenant.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        htmlContent: campaign.htmlContent,
        scheduledAt: null,
      });
    }

    // Log seed event
    await storage.createEventLog({
      tenantId: null,
      type: "database_seeded",
      payload: { timestamp: new Date().toISOString() },
    });

    console.log("Database seeded successfully!");
    console.log("\n--- Demo Accounts ---");
    console.log("Admin: admin@mailflow.io / admin123");
    console.log("User: demo@example.com / demo123");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

function getWelcomeEmailTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Demo Company!</h1>
  </div>
  <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi {{firstName}},</p>
    <p>We're thrilled to have you join our community! Here's what you can expect from us:</p>
    <ul style="padding-left: 20px;">
      <li>Weekly insights and tips</li>
      <li>Exclusive member benefits</li>
      <li>Early access to new features</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Get Started</a>
    </div>
    <p>Best regards,<br>The Demo Company Team</p>
  </div>
  <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0;">{{companyAddress}}</p>
    <p style="margin: 0;"><a href="{{unsubscribeUrl}}" style="color: #6b7280;">Unsubscribe</a></p>
  </div>
</body>
</html>`;
}

function getNewsletterTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e293b; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">June Newsletter</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Your monthly update from Demo Company</p>
  </div>
  <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1e293b; margin-top: 0;">Hello {{firstName}}!</h2>
    <p>Here's what's new this month at Demo Company:</p>
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #3b82f6;">New Feature Launch</h3>
      <p style="margin-bottom: 0;">We've just released our most requested feature yet. Check it out!</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #10b981;">Customer Spotlight</h3>
      <p style="margin-bottom: 0;">See how Company X increased their productivity by 40%.</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Read More</a>
    </div>
  </div>
  <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0;">{{companyAddress}}</p>
    <p style="margin: 0;"><a href="{{unsubscribeUrl}}" style="color: #6b7280;">Unsubscribe</a></p>
  </div>
</body>
</html>`;
}

function getProductLaunchTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <p style="color: rgba(255,255,255,0.9); margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">Introducing</p>
    <h1 style="color: white; margin: 0; font-size: 32px;">Our New Product Line</h1>
  </div>
  <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">Hi {{firstName}},</p>
    <p>We're excited to announce the launch of our brand new product line!</p>
    <p>After months of development and customer feedback, we've created something truly special. Here's what you'll love:</p>
    <ul style="padding-left: 20px;">
      <li>Innovative design</li>
      <li>Premium materials</li>
      <li>Best-in-class performance</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Shop Now</a>
    </div>
    <p>Best regards,<br>The Demo Company Team</p>
  </div>
  <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0;">{{companyAddress}}</p>
    <p style="margin: 0;"><a href="{{unsubscribeUrl}}" style="color: #6b7280;">Unsubscribe</a></p>
  </div>
</body>
</html>`;
}

function getSaleCampaignTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <p style="color: rgba(255,255,255,0.9); margin: 0 0 5px 0; font-size: 18px;">Limited Time Offer</p>
    <h1 style="color: white; margin: 0; font-size: 42px; font-weight: 800;">UP TO 50% OFF</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Summer Sale Starts Now!</p>
  </div>
  <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0; font-size: 18px;">Hey {{firstName}}!</p>
    <p>Our biggest sale of the year is here! Don't miss out on incredible savings across our entire collection.</p>
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">Use code: SUMMER50 at checkout</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="display: inline-block; background: #ef4444; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Shop the Sale</a>
    </div>
    <p style="text-align: center; color: #6b7280; font-size: 14px;">Offer ends Sunday at midnight!</p>
  </div>
  <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0;">{{companyAddress}}</p>
    <p style="margin: 0;"><a href="{{unsubscribeUrl}}" style="color: #6b7280;">Unsubscribe</a></p>
  </div>
</body>
</html>`;
}
