import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isMember?: boolean;
      isPaidMember?: boolean;
      isInstructor?: boolean;
      isSupport?: boolean;
      stripeCustomerId?: string;
      discordUsername?: string;
      discordDisplayName?: string;
    };
  }

  interface Profile {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    discordId?: string;
    isMember?: boolean;
    isPaidMember?: boolean;
    isInstructor?: boolean;
    isSupport?: boolean;
    stripeCustomerId?: string;
    discordUsername?: string;
    discordDisplayName?: string;
    email?: string;
  }
}
