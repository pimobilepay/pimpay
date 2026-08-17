import urllib.request
import urllib.parse
import json
import sys

def delete_all_vercel_env_vars(token, project_id):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 1. Fetch all environment variables
    url = f"https://api.vercel.com/v9/projects/{project_id}/env"
    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            envs = data.get("envs", [])
            print(f"Trouvé {len(envs)} variables d'environnement.")
    except Exception as e:
        print(f"Erreur lors de la récupération des variables : {e}")
        return

    if not envs:
        print("Aucune variable à supprimer.")
        return

    # 2. Delete each environment variable by ID
    success_count = 0
    for env in envs:
        env_id = env.get("id")
        key = env.get("key")
        delete_url = f"https://api.vercel.com/v9/projects/{project_id}/env/{env_id}"
        del_req = urllib.request.Request(delete_url, headers=headers, method="DELETE")

        try:
            with urllib.request.urlopen(del_req) as del_resp:
                if del_resp.status in (200, 204):
                    print(f"Supprimé avec succès : {key} ({env_id})")
                    success_count += 1
                else:
                    print(f"Échec de suppression pour : {key}")
        except Exception as e:
            print(f"Erreur lors de la suppression de {key} : {e}")

    print(f"Terminé : {success_count}/{len(envs)} variables supprimées.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python delete_vercel_envs.py <VERCEL_TOKEN> <PROJECT_ID_OR_NAME>")
        sys.exit(1)

    token = sys.argv[1]
    project_id = sys.argv[2]
    delete_all_vercel_env_vars(token, project_id)
