const udp = require('dgram');
const EventEmitter = require('events').EventEmitter;

class VoiceUdpConnection  extends EventEmitter {

    constructor(ip, port, ssrc){
        super();
        this.ip = ip;
        this.port = port;
        this.ssrc = ssrc;
        this.socket = udp.createSocket('udp4');
    }

   //  shutdown() {
   //      if (this.socket) {
   //          this.socket.removeAllListeners('message');
   //          try {
   //              this.socket.close();
   //          } finally {
   //              this.socket = null;
   //          }
   //      }
   //  }
   //
   // getPort() {
   //      return this.port;
   //  }

    send(packet) {
        return new Promise((resolve, reject) => {
            this.socket.send(packet, 0, packet.length, this.port, this.ip, error => {
                if (error) reject(error); else resolve(packet);
            });
        });
    }


    createIpDiscoveryPacket(){
        const packet = Buffer.alloc(70);
        packet.writeUIntBE(this.ssrc, 0, 4);
        return packet;
    }

    async discoverIp(){
        let result = await this.send(this.createIpDiscoveryPacket());

        if(!result) {
            throw Error("could not send ip discovery packet");
        }

       return new Promise((resolve,reject) =>{
            this.socket.once('message', message => {
                const result = VoiceUdpConnection.extractIpAndPort(message);
                if (result.error) {
                    reject(result);
                }
                resolve(result);
            });
        });

    }

    static extractIpAndPort(message) {
        try {
            const packet = Buffer.from(message);
            let address = '';
            for (let i = 4; i < packet.indexOf(0, i); i++) address += String.fromCharCode(packet[i]);
            const port = parseInt(packet.readUIntLE(packet.length - 2, 2).toString(10), 10);
            return { address, port };
        } catch (error) {
            return { error };
        }
    }
}

module.exports = VoiceUdpConnection;
