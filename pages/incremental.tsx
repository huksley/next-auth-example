import { GetServerSidePropsContext } from "next";
import { unstable_getServerSession } from "next-auth";
import { useSession, signIn } from "next-auth/react";
import Layout from "../components/layout";
import clientPromise from "../lib/mongodb";
import { authOptions } from "./api/auth/[...nextauth]";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await unstable_getServerSession(context.req, context.res, authOptions);

  let scopes: string | undefined;
  if (session?.user?.email) {
    const client = await clientPromise;
    const document = await client.db().collection("appusers").findOne({ email: session?.user?.email });
    if (document) {
      console.info("User", document)
      scopes = document.scope
    } else {
      console.warn("Can't find", session?.user?.email)
    }
  }

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
      scopes: scopes || null,
    },
  };
}

export default function IncrementalPage({ scopes }: { scopes: string }) {
  const { data } = useSession();

  return (
    <Layout>
      <p>Current scopes: {scopes}</p>
      <a
        href="#"
        onClick={(event) => {
          event.stopPropagation();
          signIn("google", undefined, {
            login_hint: data?.user?.email!,
            add_scope: "https://www.googleapis.com/auth/drive.readonly",
          });
        }}
      >
        Add drive permission
      </a>
    </Layout>
  );
}
