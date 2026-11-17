import {departmentId} from "@/lib/portal/config";
export default function LoadingSupplierActivity(){
 return <main className="sr-shell" data-dept={departmentId}>
  <div className="sr-loader" aria-busy="true" role="status">Loading supplier activity…</div>
 </main>;
}
