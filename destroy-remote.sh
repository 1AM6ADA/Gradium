#!/bin/bash
# ============================================================================
#  ONE-CLICK: delete the entire Gradium deployment on the production server.
#  Run this from your laptop:   ./destroy-remote.sh
#  It SSHes in and runs the server-side teardown, which removes the app,
#  images, build files and database — and leaves the strongSwan/IPsec VPN
#  and Docker itself completely untouched.
#
#  You'll be asked for the server's root password once (nothing is stored).
#
#    ./destroy-remote.sh        -> delete EVERYTHING (including the database)
#    ./destroy-remote.sh -k     -> delete app but KEEP the database
# ============================================================================
SERVER="root@90.156.255.209"
KEEP_FLAG="$1"

echo "About to PERMANENTLY DELETE the Gradium deployment on ${SERVER}."
[ "$KEEP_FLAG" = "-k" ] || [ "$KEEP_FLAG" = "--keep-data" ] \
  && echo "(database will be KEPT)" \
  || echo "(database WILL be deleted)"
read -r -p "Type 'DELETE' to confirm: " ans
[ "$ans" = "DELETE" ] || { echo "Aborted."; exit 1; }

ssh -o StrictHostKeyChecking=accept-new "$SERVER" \
    "bash /root/gradium-v5/teardown.sh ${KEEP_FLAG}"
