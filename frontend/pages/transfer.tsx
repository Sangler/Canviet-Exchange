import type { GetServerSideProps } from 'next';

// Temporary/legacy alias: redirect /transfer -> /transfers
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/transfers',
      permanent: false,
    },
  };
};

export default function TransferAlias() {
  return null;
}
