import { Sidebar, SidebarSkeleton } from "./_components/sidebar";
import { Navbar } from "./_components/navbar";
import { Container } from "./_components/container";
import { Suspense } from "react";

const BrowseLayout = ({ children }: { children: React.ReactNode }) => {
  
  return (
    <>
      <Navbar />

      {/* Sidebar + main content */}
      <div className="flex min-h-screen">
        <Suspense fallback={<SidebarSkeleton/>}>
          <Sidebar />
        </Suspense>
      
        <Container>{children}</Container>
      </div>
    </>
  );
};

export default BrowseLayout;
