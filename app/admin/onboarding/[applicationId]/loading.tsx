export default function LoadingApplication(){
 return <main className="admin-work-loading" aria-busy="true" aria-label="Loading application details">
  <div className="admin-loading-line wide"/><div className="admin-loading-line"/>
  <div className="admin-loading-panel"><div className="admin-loading-line"/>
   {Array.from({length:5},(_,i)=><div key={i} className="admin-loading-row"><span/><span/><span/></div>)}
  </div>
 </main>;
}
