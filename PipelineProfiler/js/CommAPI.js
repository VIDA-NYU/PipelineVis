export default class CommAPI{
  constructor(api_call_id, callback) {
    if (window.Jupyter !== undefined) {
      this.comm = window.Jupyter.notebook.kernel.comm_manager.new_comm(api_call_id, {});
      this.comm.on_msg(msg => {
        console.log(msg);
        const data = msg.content.data;
        console.log(data);
        callback(data);
      });
    } else {
      console.error(new Error("Cannot find Jupyter namespace from javascript"));
    }
  }

  call(msg) {
    if (this.comm){
      this.comm.send(msg);
    }
  }
}