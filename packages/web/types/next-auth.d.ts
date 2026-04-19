import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      wallet: string;
      twitterId?: string | null;
      twitterHandle?: string | null;
      twitterLinked?: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
