import { GetServerSidePropsContext } from "next";
import { unstable_getServerSession } from "next-auth";
import { useSession, signIn } from "next-auth/react";
import Layout from "../components/layout";
import clientPromise from "../lib/mongodb";
import { authOptions } from "./api/auth/[...nextauth]";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await unstable_getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  if (session?.user?.email) {
    const client = await clientPromise;
    const document = await client.db().collection("appusers").findOne({ email: session?.user?.email });
    if (document) {
      console.info("User", document);
      return {
        props: {
          scope: document.scope || null,
          email: document.email || null,
          provider: document.provider || null
        },
      };
    } else {
      console.warn("Can't find", session?.user?.email);
    }
  }

  return {
    props: {},
  };
}

const DRIVE = "https://www.googleapis.com/auth/drive.readonly";

export default function IncrementalPage({ scope, email, provider }: { scope?: string; email?: string, provider?: string }) {
  const { data } = useSession();

  return (
    <Layout>
      <p>Email: {email}</p>
      <p>Provider: {provider}</p>
      <p>Current scopes: {scope}</p>

      {scope?.split(" ").includes(DRIVE) ? (
        <a
          href="#"
          onClick={(event) => {
            event.stopPropagation();
            signIn("google", undefined, {
              login_hint: data?.user?.email!,
              scope: "openid",
            });
          }}
        >
          Sign-In without drive permission
        </a>
      ) : (
        <a
          href="#"
          onClick={(event) => {
            event.stopPropagation();
            signIn("google", undefined, {
              login_hint: data?.user?.email!,
              scope: ["openid", DRIVE].join(" "),
            });
          }}
        >
          Sign-In and add drive permission
        </a>
      )}
    </Layout>
  );
}
