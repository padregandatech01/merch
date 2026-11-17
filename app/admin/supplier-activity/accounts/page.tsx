import {redirect} from "next/navigation";
import {customerType,supplierTypes} from "@/lib/portal/config";
import {inlineCubeUrl,parseCubeView,type CubeParams} from "@/lib/admin/account-cube-model";

export default async function LegacyAccountAnalysis({searchParams}:{searchParams:Promise<CubeParams>}){
 const view=parseCubeView(await searchParams,[customerType,...supplierTypes]);
 redirect(inlineCubeUrl(view));
}
